# Deployment Guide

This guide covers deploying the Telegram Downloader v2 application to Docker Hub using both manual scripts and automated CI/CD.

## 🚀 Quick Start

### Manual Deployment
```bash
# Deploy to Docker Hub
./scripts/deploy-docker.sh -u your-dockerhub-username

# Build and test locally
./scripts/build-local.sh
```

### Automated Deployment (Recommended)
1. Set up GitHub secrets (see [CI/CD Setup](#cicd-setup))
2. Create a new release or push to main branch
3. GitHub Actions automatically builds and deploys

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Hub account
- (For CI/CD) GitHub repository with Actions enabled

## 🔧 Manual Deployment

### Using the Deployment Script

The `scripts/deploy-docker.sh` script provides a complete solution for building and pushing Docker images to Docker Hub.

#### Basic Usage
```bash
# Deploy with your Docker Hub username
./scripts/deploy-docker.sh -u your-username

# Deploy with custom version
./scripts/deploy-docker.sh -u your-username -v 2.1.0

# Deploy with custom repository name
./scripts/deploy-docker.sh -u your-username -r my-telegram-bot
```

#### Advanced Options
```bash
# See all available options
./scripts/deploy-docker.sh --help

# Dry run (see what would be deployed)
./scripts/deploy-docker.sh --dry-run -u your-username

# Custom platforms
./scripts/deploy-docker.sh -u your-username -p linux/amd64

# Use environment variable for username
export DOCKER_USERNAME=your-username
./scripts/deploy-docker.sh
```

#### What the Script Does
1. **Validates environment** - Checks Docker and buildx availability
2. **Authenticates** - Logs into Docker Hub
3. **Sets up multi-platform builds** - Configures buildx for ARM64/AMD64
4. **Builds and pushes** - Creates images for multiple architectures
5. **Tags properly** - Applies version and `latest` tags

### Manual Docker Commands

If you prefer manual control:

```bash
# 1. Build the image
docker build -t your-username/telegram-downloader-v2:1.0.0 .

# 2. Tag as latest
docker tag your-username/telegram-downloader-v2:1.0.0 your-username/telegram-downloader-v2:latest

# 3. Push to Docker Hub
docker push your-username/telegram-downloader-v2:1.0.0
docker push your-username/telegram-downloader-v2:latest
```

## 🔄 CI/CD Setup

### GitHub Actions Automatic Deployment

The repository includes a complete GitHub Actions workflow for automated deployment.

#### Required GitHub Secrets

Set these in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKER_USERNAME` | Your Docker Hub username | `johndoe` |
| `DOCKER_PASSWORD` | Docker Hub password or access token | `dckr_pat_...` |

#### Setting Up Secrets

1. **Go to GitHub repository settings**
   ```
   Your Repository > Settings > Secrets and variables > Actions
   ```

2. **Add Docker Hub credentials**
   ```bash
   # Create Docker Hub access token (recommended over password)
   # Go to: https://hub.docker.com/settings/security
   # Create new access token with Read, Write, Delete permissions
   ```

3. **Add secrets**
   - Click "New repository secret"
   - Name: `DOCKER_USERNAME`, Value: `your-dockerhub-username`
   - Name: `DOCKER_PASSWORD`, Value: `your-access-token`

#### Trigger Conditions

The CI/CD pipeline automatically triggers on:

- **Version tags**: `git tag v1.0.0 && git push origin v1.0.0`
- **Main branch pushes**: Any push to the main branch
- **Manual trigger**: Via GitHub Actions UI

#### What Gets Built

| Trigger | Tags Created | Platforms |
|---------|-------------|-----------|
| `v1.2.3` tag | `1.2.3`, `1.2`, `1`, `latest` | linux/amd64, linux/arm64 |
| `main` branch | `main`, `latest` | linux/amd64, linux/arm64 |
| `feature-branch` | `feature-branch` | linux/amd64, linux/arm64 |

#### Workflow Features

- ✅ **Runs tests** before building
- ✅ **Multi-platform builds** (AMD64 + ARM64)
- ✅ **Auto-updates** Docker Hub description
- ✅ **Build caching** for faster builds
- ✅ **Semantic versioning** support

## 🧪 Local Development

### Build and Test Locally

Use the local build script for development:

```bash
# Build and test the image
./scripts/build-local.sh

# Only build (skip tests)
./scripts/build-local.sh --build-only

# Only test existing image
./scripts/build-local.sh --test-only

# Build with custom tag
./scripts/build-local.sh -t development

# Build, test, and cleanup
./scripts/build-local.sh --clean
```

### Test Suite

The local build script runs comprehensive tests:

1. **Runtime test** - Verifies Node.js works
2. **Dependencies test** - Checks yt-dlp installation
3. **Application test** - Validates built files exist
4. **Security test** - Confirms non-root user
5. **Startup test** - Basic application smoke test

## 📦 Version Management

### Semantic Versioning

The project uses semantic versioning (SemVer):

```bash
# Patch release (bug fixes)
npm version patch  # 1.0.0 -> 1.0.1

# Minor release (new features)
npm version minor  # 1.0.1 -> 1.1.0

# Major release (breaking changes)
npm version major  # 1.1.0 -> 2.0.0

# Create and push tag
git push origin --tags
```

### Manual Versioning

```bash
# Tag manually
git tag v1.2.3
git push origin v1.2.3

# Deploy specific version
./scripts/deploy-docker.sh -u username -v 1.2.3
```

## 🛡️ Security

### Access Tokens (Recommended)

Use Docker Hub access tokens instead of passwords:

1. Go to [Docker Hub Security Settings](https://hub.docker.com/settings/security)
2. Create new access token with Read, Write, Delete permissions
3. Use token as `DOCKER_PASSWORD` secret

### Security Best Practices

- ✅ **Non-root user** in container
- ✅ **Minimal base image** (Alpine Linux)
- ✅ **No secrets** in image
- ✅ **Read-only filesystem** where possible
- ✅ **Resource limits** configured

## 🔍 Monitoring

### Health Checks

The deployed image includes health monitoring:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' container-name

# Manual health check
curl http://localhost:3000/health
```

### Logs

```bash
# View container logs
docker logs telegram-downloader

# Follow logs in real-time
docker logs -f telegram-downloader

# Docker Compose logs
docker-compose logs -f
```

## 🎯 Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy new version
docker pull your-username/telegram-downloader-v2:2.0.0

# Start new container
docker run -d --name telegram-downloader-v2 \
  -p 3001:3000 \
  -e TELEGRAM_BOT_TOKEN=$TOKEN \
  your-username/telegram-downloader-v2:2.0.0

# Test new version
curl http://localhost:3001/health

# Switch traffic (update proxy/load balancer)
# Stop old container
docker stop telegram-downloader-v1
```

### Rolling Updates with Docker Compose

```yaml
# docker-compose.yml
services:
  telegram-downloader:
    image: your-username/telegram-downloader-v2:${VERSION:-latest}
    # ... other config
```

```bash
# Update version
export VERSION=2.0.0
docker-compose up -d
```

## ❗ Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Docker build cache
docker builder prune

# Check Docker disk space
docker system df

# Clean up unused images
docker image prune -a
```

#### Authentication Issues

```bash
# Re-login to Docker Hub
docker logout
docker login

# Check credentials
docker info | grep Username
```

#### Multi-platform Build Issues

```bash
# Recreate buildx builder
docker buildx rm telegram-downloader-builder
./scripts/deploy-docker.sh -u username
```

### Getting Help

1. **Check logs** first
2. **Verify prerequisites** are installed
3. **Test locally** before deploying
4. **Check GitHub Actions** logs for CI/CD issues

## 📚 Additional Resources

- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

---

**Next Steps:**
1. Set up Docker Hub account
2. Configure GitHub secrets
3. Create your first release
4. Monitor deployment in GitHub Actions 