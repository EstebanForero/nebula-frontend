# Simple multi-stage build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock tsconfig.json vite.config.ts index.html ./

# Copy public files and source code
COPY public ./public
COPY src ./src

# Install dependencies
RUN bun install --frozen-lockfile

# Build the application
RUN bun run build

# Production stage with nginx
FROM nginx:alpine AS runner

WORKDIR /usr/share/nginx/html

# Copy built files from build stage
COPY --from=builder /app/dist ./

# Copy nginx configuration and runtime env injector
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint-config.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
