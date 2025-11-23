#!/usr/bin/env node

// Test WebSocket on port 80 (where frontend is accessible)
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NjM4OTIzNjgsInN1YiI6IjkwYzQ0YWYwLTM2NTktNDJhOC1iMjQ5LTlmMDQyMjM2MDRmYyJ9.TqQ78WUa_mjp8GCnN9qJuNooBUx2ZxNMonPrRDC45Us"
const roomId = "a0cdab9d-e68b-408c-9af1-712ea7e91e3f"  // Real room ID from the API

console.log('Testing WebSocket connections on PORT 80...')
console.log('This is where the frontend is accessible')

// Test 1: ws://localhost/ws/rooms/{roomId} (port 80)
console.log('\n=== Test 1: ws://localhost/ws/rooms/{roomId} (port 80) ===')
const ws1 = new WebSocket(`ws://localhost/ws/rooms/${roomId}?token=${token}`)

ws1.onopen = () => {
  console.log('✅ SUCCESS: Connected to ws://localhost/ws/rooms/{roomId} on port 80!')
  console.log('This means WebSocket is working through the same port as the frontend')
  ws1.close()
}

ws1.onerror = (error) => {
  console.log('❌ FAILED: WebSocket connection failed on port 80')
  console.log('Error:', error)
}

ws1.onclose = () => {
  console.log('Connection closed')

  // Test 2: ws://localhost/api/backend/ws/rooms/{roomId} (port 80, with API path)
  console.log('\n=== Test 2: ws://localhost/api/backend/ws/rooms/{roomId} (port 80, with API path) ===')
  const ws2 = new WebSocket(`ws://localhost/api/backend/ws/rooms/${roomId}?token=${token}`)

  ws2.onopen = () => {
    console.log('✅ SUCCESS: Connected to ws://localhost/api/backend/ws/rooms/{roomId} on port 80!')
    console.log('This means WebSocket path includes /api/backend')
    ws2.close()
  }

  ws2.onerror = (error) => {
    console.log('❌ FAILED: WebSocket connection failed with API path on port 80')
    console.log('Error:', error)
  }

  ws2.onclose = () => {
    console.log('Connection closed')
    console.log('\n=== WebSocket Tests Complete ===')
  }
}