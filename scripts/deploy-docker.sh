#!/bin/bash

# Docker Hub Deployment Script for Telegram Downloader v2
# This script builds and pushes the Docker image to Docker Hub

set -e  # Exit on any error

# Configuration
DOCKER_REPO="telegram-downloader-v2"
DOCKER_USERNAME="${DOCKER_USERNAME:-}"
BUILD_PLATFORM="linux/amd64,linux/arm64"

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

# Function to get version from package.json
get_version() {
    if command -v node >/dev/null 2>&1; then
        node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0"
    elif command -v jq >/dev/null 2>&1; then
        jq -r '.version' package.json 2>/dev/null || echo "1.0.0"
    else
        echo "1.0.0"
    fi
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if buildx is available
check_buildx() {
    if ! docker buildx version >/dev/null 2>&1; then
        log_error "Docker buildx is not available. Please update Docker to use multi-platform builds."
        exit 1
    fi
}

# Function to login to Docker Hub
docker_login() {
    if [ -z "$DOCKER_USERNAME" ]; then
        log_warning "DOCKER_USERNAME not set. Please enter your Docker Hub username:"
        read -r DOCKER_USERNAME
    fi
    
    if [ -z "$DOCKER_USERNAME" ]; then
        log_error "Docker Hub username is required"
        exit 1
    fi
    
    log_info "Logging in to Docker Hub as $DOCKER_USERNAME..."
    if ! docker login -u "$DOCKER_USERNAME"; then
        log_error "Failed to login to Docker Hub"
        exit 1
    fi
    
    log_success "Successfully logged in to Docker Hub"
}

# Function to create buildx builder if it doesn't exist
setup_buildx() {
    local builder_name="telegram-downloader-builder"
    
    if ! docker buildx ls | grep -q "$builder_name"; then
        log_info "Creating buildx builder for multi-platform builds..."
        docker buildx create --name "$builder_name" --driver docker-container --bootstrap
    fi
    
    docker buildx use "$builder_name"
    log_success "Buildx builder ready"
}

# Function to build and push Docker image
build_and_push() {
    local version="$1"
    local image_name="$DOCKER_USERNAME/$DOCKER_REPO"
    
    log_info "Building Docker image for platforms: $BUILD_PLATFORM"
    log_info "Image name: $image_name"
    log_info "Version: $version"
    
    # Build and push with multiple tags
    docker buildx build \
        --platform "$BUILD_PLATFORM" \
        --tag "$image_name:$version" \
        --tag "$image_name:latest" \
        --push \
        .
    
    log_success "Successfully built and pushed image with tags:"
    log_success "  - $image_name:$version"
    log_success "  - $image_name:latest"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --username USERNAME    Docker Hub username"
    echo "  -v, --version VERSION      Version tag (default: from package.json)"
    echo "  -r, --repo REPO           Repository name (default: telegram-downloader-v2)"
    echo "  -p, --platform PLATFORMS  Build platforms (default: linux/amd64,linux/arm64)"
    echo "  --dry-run                 Show what would be done without executing"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_USERNAME           Docker Hub username"
    echo ""
    echo "Examples:"
    echo "  $0 -u myusername"
    echo "  $0 -u myusername -v 2.1.0"
    echo "  $0 --dry-run"
}

# Parse command line arguments
DRY_RUN=false
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--username)
            DOCKER_USERNAME="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -r|--repo)
            DOCKER_REPO="$2"
            shift 2
            ;;
        -p|--platform)
            BUILD_PLATFORM="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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
    log_info "Starting Docker Hub deployment for Telegram Downloader v2"
    
    # Get version if not provided
    if [ -z "$VERSION" ]; then
        VERSION=$(get_version)
        log_info "Detected version from package.json: $VERSION"
    fi
    
    # Dry run mode
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No actual deployment will occur"
        echo ""
        echo "Would deploy:"
        echo "  Repository: $DOCKER_USERNAME/$DOCKER_REPO"
        echo "  Version: $VERSION"
        echo "  Platforms: $BUILD_PLATFORM"
        echo "  Tags: $VERSION, latest"
        exit 0
    fi
    
    # Pre-flight checks
    check_docker
    check_buildx
    
    # Ensure we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found. Please run this script from the project root."
        exit 1
    fi
    
    # Login and setup
    docker_login
    setup_buildx
    
    # Build and push
    build_and_push "$VERSION"
    
    log_success "Deployment completed successfully!"
    log_info "Your image is now available at:"
    log_info "  docker pull $DOCKER_USERNAME/$DOCKER_REPO:$VERSION"
    log_info "  docker pull $DOCKER_USERNAME/$DOCKER_REPO:latest"
}

# Run main function
main "$@" 