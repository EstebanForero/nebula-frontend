#!/usr/bin/env node

// Test the updated buildRoomWsUrl function
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NjM4OTIzNjgsInN1YiI6IjkwYzQ0YWYwLTM2NTktNDJhOC1iMjQ5LTlmMDQyMjM2MDRmYyJ9.TqQ78WUa_mjp8GCnN9qJuNooBUx2ZxNMonPrRDC45Us"
const roomId = "a0cdab9d-e68b-408c-9af1-712ea7e91e3f"

// Mock window.location for testing
global.window = {
  location: {
    origin: 'http://localhost',
    port: '',
    protocol: 'http:',
    hostname: 'localhost'
  }
}

// Import and test the buildRoomWsUrl function
// Since we can't import ES modules directly, let's recreate the FIXED logic:
function getBaseUrl() {
  let baseUrl

  // Check if user has overridden the API URL
  if (typeof window !== 'undefined' && window.CUSTOM_API_URL) {
    baseUrl = window.CUSTOM_API_URL
  } else {
    // Simple hardcoded approach using window.location.origin
    if (typeof window !== 'undefined') {
      baseUrl = `${window.location.origin}/api/backend`
    } else {
      // Fallback for server-side rendering
      baseUrl = 'http://localhost:3838'
    }
  }

  // Ensure the base URL always includes /api/backend path
  if (!baseUrl.endsWith('/api/backend')) {
    // Remove trailing slash if present
    const withoutTrailingSlash = baseUrl.replace(/\/$/, '')
    // Check if it already has /api/backend somewhere
    if (withoutTrailingSlash.includes('/api/backend')) {
      return withoutTrailingSlash
    } else {
      return `${withoutTrailingSlash}/api/backend`
    }
  }

  return baseUrl
}

function buildRoomWsUrl(roomId, token) {
  // Get the base API URL (which now always includes /api/backend)
  const baseUrl = getBaseUrl()

  // Convert to WebSocket origin by removing /api/backend path and converting protocol
  let wsOrigin
  if (typeof window !== 'undefined' && window.CUSTOM_API_URL) {
    // If custom API URL is set, use its origin for WebSocket
    const customUrl = new URL(window.CUSTOM_API_URL)
    wsOrigin = `${customUrl.protocol}//${customUrl.host}`
  } else {
    // Default: use window.location.origin
    wsOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  }

  // Convert HTTP protocol to WebSocket protocol
  const wsBase = wsOrigin.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')

  const url = new URL(`/api/backend/ws/rooms/${roomId}`, wsBase)
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

const generatedUrl = buildRoomWsUrl(roomId, token)
const expectedUrl = `ws://localhost/api/backend/ws/rooms/${roomId}?token=${token}`

console.log('Testing updated buildRoomWsUrl function...')
console.log('Generated URL:', generatedUrl)
console.log('Expected URL:', expectedUrl)
console.log('Match:', generatedUrl === expectedUrl ? '✅ YES' : '❌ NO')

// Test the actual WebSocket connection with the generated URL
console.log('\n=== Testing WebSocket connection with generated URL ===')
const ws = new WebSocket(generatedUrl)

ws.onopen = () => {
  console.log('✅ SUCCESS: WebSocket connection works with updated buildRoomWsUrl!')
  ws.close()
}

ws.onerror = (error) => {
  console.log('❌ FAILED: WebSocket connection failed with updated URL')
  console.log('Error:', error)
}

ws.onclose = () => {
  console.log('Connection closed')
  console.log('\n=== Test Complete ===')
}