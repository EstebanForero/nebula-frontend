// Runtime environment overrides for the frontend.
// This file is replaced at container startup by docker-entrypoint-config.sh when running in Docker.
// For local development it simply provides an empty object to avoid 404s.
;(function () {
  // Preserve existing values if another script set them earlier.
  const existing = (typeof window !== 'undefined' && (window as any).ENV) || {}
  ;(window as any).ENV = { ...existing }
})()
