#!/usr/bin/env node

// Simple WebSocket test script
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NjM4OTIzNjgsInN1YiI6IjkwYzQ0YWYwLTM2NTktNDJhOC1iMjQ5LTlmMDQyMjM2MDRmYyJ9.TqQ78WUa_mjp8GCnN9qJuNooBUx2ZxNMonPrRDC45Us"
const roomId = "test-room-123"

console.log('Testing WebSocket connections...')

// Test 1: Connect to ws://localhost/api/backend/ws/rooms/{roomId}
console.log('\n=== Test 1: ws://localhost/api/backend/ws/rooms/{roomId} ===')
const ws1 = new WebSocket(`ws://localhost/api/backend/ws/rooms/${roomId}?token=${token}`)

ws1.onopen = () => {
  console.log('✅ Connection successful to ws://localhost/api/backend/ws/rooms/{roomId}')
  ws1.close()
}

ws1.onerror = (error) => {
  console.log('❌ Connection failed to ws://localhost/api/backend/ws/rooms/{roomId}')
  console.log('Error:', error)
}

ws1.onclose = () => {
  console.log('Connection closed')

  // Test 2: Connect to ws://localhost/ws/rooms/{roomId}
  console.log('\n=== Test 2: ws://localhost/ws/rooms/{roomId} ===')
  const ws2 = new WebSocket(`ws://localhost/ws/rooms/${roomId}?token=${token}`)

  ws2.onopen = () => {
    console.log('✅ Connection successful to ws://localhost/ws/rooms/{roomId}')
    ws2.close()
  }

  ws2.onerror = (error) => {
    console.log('❌ Connection failed to ws://localhost/ws/rooms/{roomId}')
    console.log('Error:', error)
  }

  ws2.onclose = () => {
    console.log('Connection closed')

    // Test 3: Connect to ws://localhost:3838/ws/rooms/{roomId}
    console.log('\n=== Test 3: ws://localhost:3838/ws/rooms/{roomId} ===')
    const ws3 = new WebSocket(`ws://localhost:3838/ws/rooms/${roomId}?token=${token}`)

    ws3.onopen = () => {
      console.log('✅ Connection successful to ws://localhost:3838/ws/rooms/{roomId}')
      ws3.close()
    }

    ws3.onerror = (error) => {
      console.log('❌ Connection failed to ws://localhost:3838/ws/rooms/{roomId}')
      console.log('Error:', error)
    }

    ws3.onclose = () => {
      console.log('Connection closed')
      console.log('\n=== WebSocket Tests Complete ===')
    }
  }
}

setTimeout(() => {
  console.log('\n=== Testing HTTP API first ===')

  // Test HTTP API to see if backend is accessible
  fetch('http://localhost/api/backend/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      console.log('✅ HTTP API accessible at http://localhost/api/backend')
      return response.json()
    } else {
      console.log('❌ HTTP API not accessible at http://localhost/api/backend')
      console.log('Status:', response.status, response.statusText)
    }
  })
  .then(data => {
    if (data) console.log('API Response:', data)
  })
  .catch(error => {
    console.log('❌ HTTP API Error:', error.message)

    // Try alternative HTTP endpoint
    fetch('http://localhost:3838/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ HTTP API accessible at http://localhost:3838')
        return response.json()
      } else {
        console.log('❌ HTTP API not accessible at http://localhost:3838')
        console.log('Status:', response.status, response.statusText)
      }
    })
    .then(data => {
      if (data) console.log('API Response:', data)
    })
    .catch(error2 => {
      console.log('❌ HTTP API Error at localhost:3838:', error2.message)
    })
  })
}, 1000)