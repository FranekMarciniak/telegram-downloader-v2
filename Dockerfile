# Multi-stage build for NestJS Telegram Downloader with yt-dlp support

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    git

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runtime

WORKDIR /app

# Install runtime dependencies including Python and yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates && \
    # Install latest yt-dlp using --break-system-packages for Alpine compatibility
    pip3 install --break-system-packages --no-cache-dir --upgrade yt-dlp && \
    # Create a non-root user
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/downloads && \
    chmod 755 /tmp/downloads && \
    chown -R nestjs:nodejs /app /tmp/downloads

# Switch to non-root user
USER nestjs

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "dist/main"] 