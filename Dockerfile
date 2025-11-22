# Option 1: Runtime Environment Variables (Flexible - can change at container runtime)
FROM oven/bun:1 AS build
WORKDIR /app

# Build with placeholder values that will be replaced at runtime
ENV VITE_API_BASE_URL="__API_BASE_URL__"
ENV VITE_NOTIFICATION_BASE_URL="__NOTIFICATION_BASE_URL__"
ENV VITE_VAPID_PUBLIC_KEY="__VAPID_PUBLIC_KEY__"

# Copy manifests and entry HTML
COPY package.json bun.lock tsconfig.json vite.config.ts index.html .env ./
# App sources
COPY public ./public
COPY src ./src

# Install deps and build
RUN bun install --frozen-lockfile
RUN bun run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy entrypoint script for runtime env replacement
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# SPA-friendly nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Static assets
COPY --from=build /app/dist ./

# Set default environment values
ENV VITE_API_BASE_URL="http://localhost:3838"
ENV VITE_NOTIFICATION_BASE_URL="http://localhost:3010"
ENV VITE_VAPID_PUBLIC_KEY=""

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
