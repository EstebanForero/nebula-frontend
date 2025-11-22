#!/bin/sh

# Generate runtime config file from environment variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV = {
  VITE_API_BASE_URL: '${VITE_API_BASE_URL}',
  VITE_NOTIFICATION_BASE_URL: '${VITE_NOTIFICATION_BASE_URL}',
  VITE_VAPID_PUBLIC_KEY: '${VITE_VAPID_PUBLIC_KEY}'
};
EOF

echo "Generated runtime environment config:"
echo "  API_BASE_URL: ${VITE_API_BASE_URL}"
echo "  NOTIFICATION_BASE_URL: ${VITE_NOTIFICATION_BASE_URL}"
echo "  VAPID_PUBLIC_KEY: ${VITE_VAPID_PUBLIC_KEY}"

# Start nginx
exec "$@"