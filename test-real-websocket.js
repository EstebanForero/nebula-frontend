#!/usr/bin/env node

// Test WebSocket with a real room ID
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NjM4OTIzNjgsInN1YiI6IjkwYzQ0YWYwLTM2NTktNDJhOC1iMjQ5LTlmMDQyMjM2MDRmYyJ9.TqQ78WUa_mjp8GCnN9qJuNooBUx2ZxNMonPrRDC45Us"
const roomId = "a0cdab9d-e68b-408c-9af1-712ea7e91e3f"  // Real room ID from the API

console.log('Testing WebSocket connections with REAL room ID:', roomId)
console.log('This matches the room ID from the browser error')

// Test 1: ws://localhost:8080/api/backend/ws/rooms/{roomId}
console.log('\n=== Test 1: ws://localhost:8080/api/backend/ws/rooms/{roomId} ===')
const ws1 = new WebSocket(`ws://localhost:8080/api/backend/ws/rooms/${roomId}?token=${token}`)

ws1.onopen = () => {
  console.log('✅ SUCCESS: Connected to ws://localhost:8080/api/backend/ws/rooms/{roomId}')
  console.log('This means the WebSocket URL should include /api/backend path')
  ws1.close()
}

ws1.onerror = (error) => {
  console.log('❌ FAILED: WebSocket connection failed to ws://localhost:8080/api/backend/ws/rooms/{roomId}')
  console.log('Error:', error)
}

ws1.onclose = () => {
  console.log('Connection closed')

  // Test 2: ws://localhost:8080/ws/rooms/{roomId}
  console.log('\n=== Test 2: ws://localhost:8080/ws/rooms/{roomId} ===')
  const ws2 = new WebSocket(`ws://localhost:8080/ws/rooms/${roomId}?token=${token}`)

  ws2.onopen = () => {
    console.log('✅ SUCCESS: Connected to ws://localhost:8080/ws/rooms/{roomId}')
    console.log('This means the WebSocket URL should NOT include /api/backend path')
    ws2.close()
  }

  ws2.onerror = (error) => {
    console.log('❌ FAILED: WebSocket connection failed to ws://localhost:8080/ws/rooms/{roomId}')
    console.log('Error:', error)
  }

  ws2.onclose = () => {
    console.log('Connection closed')
    console.log('\n=== WebSocket Tests Complete ===')
  }
}