# Docker Deployment Guide

This guide covers how to deploy the Telegram Downloader v2 application using Docker.

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose v2.0+
- Telegram Bot Token (get from [@BotFather](https://t.me/botfather))

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-downloader-v2
   ```

2. **Create environment file**
   ```bash
   # Create .env file with your configuration
   cat > .env << EOF
   # Required: Telegram Bot Token (get from @BotFather)
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   
   # Optional: Download configuration
   DOWNLOAD_PATH=/tmp/downloads
   MAX_FILE_SIZE_MB=100
   EOF
   ```

3. **Configure your bot token**
   - Get your bot token from [@BotFather](https://t.me/botfather)
   - Replace `your_bot_token_here` in the `.env` file

4. **Build and run**
   ```bash
   docker-compose up -d
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from @BotFather | `123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Application environment | `production` | `production` |
| `PORT` | Application port | `3000` | `3000` |
| `DOWNLOAD_PATH` | Download directory path | `/tmp/downloads` | `/app/downloads` |
| `TEMP_DIR` | Alternative to DOWNLOAD_PATH | `/tmp/downloads` | `/tmp/downloads` |
| `MAX_FILE_SIZE_MB` | Maximum file size limit in MB | `100` | `250` |

## Docker Commands

### Build the image
```bash
docker build -t telegram-downloader-v2 .
```

### Verify the build
```bash
# Test yt-dlp installation
docker run --rm telegram-downloader-v2 yt-dlp --version

# Test Node.js installation
docker run --rm telegram-downloader-v2 node --version

# Test application structure
docker run --rm telegram-downloader-v2 ls -la /app
```

### Run with Docker only
```bash
docker run -d \
  --name telegram-downloader \
  -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN=your_token_here \
  -v downloads:/tmp/downloads \
  telegram-downloader-v2
```

### Run with Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Supported Platforms

The application supports downloading from:

- **YouTube** (youtube.com, youtu.be)
- **Instagram** (instagram.com) - posts, reels, stories
- **TikTok** (tiktok.com)
- **Twitter/X** (twitter.com, x.com)
- **Facebook** (facebook.com)
- **Tumblr** (tumblr.com)

## Health Monitoring

The application includes health checks accessible at:
- **Health endpoint**: `http://localhost:3000/health`
- **Ready endpoint**: `http://localhost:3000/health/ready`

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Verify `TELEGRAM_BOT_TOKEN` is correct
   - Check container logs: `docker-compose logs telegram-downloader`
   - Ensure bot is started with `/start` command

2. **Download failures**
   - Check yt-dlp is working: `docker exec telegram-downloader yt-dlp --version`
   - Verify network connectivity from container
   - Check available disk space

3. **Permission errors**
   - Ensure download volume has proper permissions
   - Check container is running as non-root user

4. **File access errors (ENOENT)**
   - Check download directory permissions: `docker exec telegram-downloader ls -la /tmp/downloads`
   - Verify environment variables: `docker exec telegram-downloader env | grep DOWNLOAD`
   - Check disk space: `docker exec telegram-downloader df -h`

### Debug Commands

```bash
# Access container shell
docker exec -it telegram-downloader sh

# Check yt-dlp version and functionality
docker exec telegram-downloader yt-dlp --version
docker exec telegram-downloader yt-dlp --help

# Test download directory permissions
docker exec telegram-downloader ls -la /tmp/
docker exec telegram-downloader touch /tmp/downloads/test.txt
docker exec telegram-downloader rm /tmp/downloads/test.txt

# Check environment configuration
docker exec telegram-downloader env | grep -E "(DOWNLOAD|TEMP)"

# View application logs with debug info
docker-compose logs -f telegram-downloader

# Check container resource usage
docker stats telegram-downloader

# Test a simple download
docker exec telegram-downloader yt-dlp --list-formats "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## Security Considerations

- The container runs as a non-root user (`nestjs`)
- Network isolation through custom Docker network
- Resource limits are configured to prevent abuse
- No new privileges can be acquired
- Temporary filesystem has security restrictions

## Performance Tuning

### Resource Limits

Adjust in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 1G        # Increase for larger files
      cpus: '1.0'       # Increase for faster processing
    reservations:
      memory: 512M
      cpus: '0.5'
```

### Volume Configuration

For persistent downloads:

```yaml
volumes:
  - ./downloads:/tmp/downloads  # Host directory
  - downloads:/tmp/downloads    # Docker volume (default)
```

## Production Deployment

For production environments:

1. **Use secrets management**
   ```bash
   # Use Docker secrets instead of environment variables
   echo "your_token" | docker secret create telegram_bot_token -
   ```

2. **Configure reverse proxy**
   ```nginx
   # Nginx configuration
   location /health {
       proxy_pass http://localhost:3000/health;
   }
   ```

3. **Set up monitoring**
   - Use health check endpoints for monitoring
   - Configure log aggregation
   - Set up resource monitoring

## Development

For development with auto-reload:

```bash
# Create development compose override
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  telegram-downloader:
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run start:dev
EOF

docker-compose up -d
``` 