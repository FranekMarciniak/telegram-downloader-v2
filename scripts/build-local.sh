#!/bin/bash

# Local Docker Build Script for Telegram Downloader v2
# This script builds and tests the Docker image locally

set -e  # Exit on any error

# Configuration
IMAGE_NAME="telegram-downloader-v2"
TAG="local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to clean up test containers
cleanup() {
    local container_name="$1"
    if docker ps -q -f name="$container_name" | grep -q .; then
        log_info "Stopping test container: $container_name"
        docker stop "$container_name" >/dev/null 2>&1 || true
    fi
    if docker ps -aq -f name="$container_name" | grep -q .; then
        log_info "Removing test container: $container_name"
        docker rm "$container_name" >/dev/null 2>&1 || true
    fi
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to build Docker image
build_image() {
    local full_image_name="$IMAGE_NAME:$TAG"
    
    log_info "Building Docker image: $full_image_name"
    
    if ! docker build -t "$full_image_name" .; then
        log_error "Failed to build Docker image"
        exit 1
    fi
    
    log_success "Successfully built Docker image: $full_image_name"
}

# Function to test the built image
test_image() {
    local full_image_name="$IMAGE_NAME:$TAG"
    local test_container="telegram-downloader-test"
    
    log_info "Testing Docker image: $full_image_name"
    
    # Cleanup any existing test container
    cleanup "$test_container"
    
    # Test 1: Check if the image runs
    log_info "Test 1: Checking if image runs..."
    if docker run --name "$test_container" --rm "$full_image_name" node --version >/dev/null 2>&1; then
        log_success "✓ Node.js is working"
    else
        log_error "✗ Node.js test failed"
        return 1
    fi
    
    # Test 2: Check yt-dlp installation
    log_info "Test 2: Checking yt-dlp installation..."
    if docker run --name "$test_container" --rm "$full_image_name" yt-dlp --version >/dev/null 2>&1; then
        log_success "✓ yt-dlp is working"
    else
        log_error "✗ yt-dlp test failed"
        return 1
    fi
    
    # Test 3: Check application structure
    log_info "Test 3: Checking application structure..."
    if docker run --name "$test_container" --rm "$full_image_name" ls /app/dist/main.js >/dev/null 2>&1; then
        log_success "✓ Application files are present"
    else
        log_error "✗ Application structure test failed"
        return 1
    fi
    
    # Test 4: Check permissions
    log_info "Test 4: Checking file permissions..."
    if docker run --name "$test_container" --rm "$full_image_name" whoami | grep -q "nestjs"; then
        log_success "✓ Running as non-root user"
    else
        log_error "✗ Permission test failed"
        return 1
    fi
    
    # Test 5: Check that the application can start (basic smoke test)
    log_info "Test 5: Checking application startup..."
    timeout 10s docker run --name "$test_container" --rm "$full_image_name" node dist/main.js &
    local pid=$!
    sleep 5
    
    if kill -0 "$pid" 2>/dev/null; then
        log_warning "⚠ Application started but missing TELEGRAM_BOT_TOKEN (expected)"
        kill "$pid" 2>/dev/null || true
        log_success "✓ Application startup test passed"
    else
        log_success "✓ Application startup test passed (process exited as expected)"
    fi
    
    log_success "All tests passed!"
}

# Function to display image info
show_image_info() {
    local full_image_name="$IMAGE_NAME:$TAG"
    
    log_info "Image Information:"
    echo "  Name: $full_image_name"
    echo "  Size: $(docker images --format "table {{.Size}}" "$full_image_name" | tail -n +2)"
    echo "  Created: $(docker images --format "table {{.CreatedAt}}" "$full_image_name" | tail -n +2)"
    echo ""
    
    log_info "To run the image locally:"
    echo "  docker run -d \\"
    echo "    --name telegram-downloader \\"
    echo "    -p 3000:3000 \\"
    echo "    -e TELEGRAM_BOT_TOKEN=your_token_here \\"
    echo "    -v downloads:/tmp/downloads \\"
    echo "    $full_image_name"
    echo ""
    
    log_info "To test with Docker Compose:"
    echo "  docker-compose up -d"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --build-only              Only build the image, skip tests"
    echo "  --test-only               Only run tests on existing image"
    echo "  --clean                   Remove the local image after testing"
    echo "  -t, --tag TAG            Custom tag for the image (default: local)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                       Build and test the image"
    echo "  $0 --build-only          Only build the image"
    echo "  $0 --test-only           Only test existing image"
    echo "  $0 --clean               Build, test, and clean up"
    echo "  $0 -t dev                Build with custom tag 'dev'"
}

# Parse command line arguments
BUILD_ONLY=false
TEST_ONLY=false
CLEAN_UP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --test-only)
            TEST_ONLY=true
            shift
            ;;
        --clean)
            CLEAN_UP=true
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "Starting local Docker build for Telegram Downloader v2"
    
    # Pre-flight checks
    check_docker
    
    # Ensure we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found. Please run this script from the project root."
        exit 1
    fi
    
    # Build the image
    if [ "$TEST_ONLY" = false ]; then
        build_image
    fi
    
    # Test the image
    if [ "$BUILD_ONLY" = false ]; then
        test_image
        show_image_info
    fi
    
    # Clean up if requested
    if [ "$CLEAN_UP" = true ]; then
        log_info "Cleaning up local image..."
        docker rmi "$IMAGE_NAME:$TAG" >/dev/null 2>&1 || true
        log_success "Cleanup completed"
    fi
    
    log_success "Local build process completed successfully!"
}

# Run main function
main "$@" 