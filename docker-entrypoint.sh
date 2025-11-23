#!/bin/sh

# Runtime build script - builds the application with actual environment variables
echo "Starting runtime build with environment variables..."

# Change to app directory for building
cd /app

echo "Environment variables available for build:"
echo "  VITE_API_BASE_URL: ${VITE_API_BASE_URL:-not set}"
echo "  VITE_NOTIFICATION_BASE_URL: ${VITE_NOTIFICATION_BASE_URL:-not set}"
echo "  VITE_VAPID_PUBLIC_KEY: ${VITE_VAPID_PUBLIC_KEY:-not set}"

# Override .env file with actual environment variables
echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env
echo "VITE_NOTIFICATION_BASE_URL=${VITE_NOTIFICATION_BASE_URL}" >> .env
echo "VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY}" >> .env

# Build the application with the actual environment variables
echo "Building application..."
bun run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build completed successfully."

# Copy built files to nginx directory
echo "Copying built files to nginx..."
cp -r /app/dist/* /usr/share/nginx/html/

echo "Files copied. Starting nginx..."

# Start nginx
exec "$@"