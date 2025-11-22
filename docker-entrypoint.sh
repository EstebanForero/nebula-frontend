#!/bin/sh

# Runtime environment variable replacement script
# This script replaces placeholder values in built JavaScript files with actual environment variables

echo "Starting runtime environment variable replacement..."

# Replace placeholders in all JS and HTML files
find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i \
  -e "s|__API_BASE_URL__|${VITE_API_BASE_URL}|g" \
  -e "s|__NOTIFICATION_BASE_URL__|${VITE_NOTIFICATION_BASE_URL}|g" \
  -e "s|__VAPID_PUBLIC_KEY__|${VITE_VAPID_PUBLIC_KEY}|g" \
  {} \;

echo "Environment variable replacement completed:"
echo "  API_BASE_URL: ${VITE_API_BASE_URL}"
echo "  NOTIFICATION_BASE_URL: ${VITE_NOTIFICATION_BASE_URL}"
echo "  VAPID_PUBLIC_KEY: ${VITE_VAPID_PUBLIC_KEY}"

# Start nginx
exec "$@"