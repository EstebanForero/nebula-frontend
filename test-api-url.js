#!/usr/bin/env node

// Test API URL generation
console.log('Testing API URL generation...')

// Mock window.location for nebula.sabanus.site
global.window = {
  location: {
    origin: 'https://nebula.sabanus.site',
    port: '',
    protocol: 'https:',
    hostname: 'nebula.sabanus.site'
  },
  // Mock custom API URL as empty initially
  CUSTOM_API_URL: undefined
}

// Recreate the FIXED getBaseUrl function
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

// Test 1: Default behavior (no custom URL)
console.log('\n=== Test 1: Default behavior ===')
const baseUrl1 = getBaseUrl()
console.log('Base URL:', baseUrl1)
const registerUrl1 = `${baseUrl1}/auth/register`
console.log('Register URL:', registerUrl1)
console.log('Includes /api/backend?', registerUrl1.includes('/api/backend'))

// Test 2: With custom API URL set to origin only
console.log('\n=== Test 2: Custom API URL set to origin only ===')
window.CUSTOM_API_URL = 'https://nebula.sabanus.site'
const baseUrl2 = getBaseUrl()
console.log('Custom API URL:', window.CUSTOM_API_URL)
console.log('Base URL returned:', baseUrl2)
const registerUrl2 = `${baseUrl2}/auth/register`
console.log('Register URL:', registerUrl2)
console.log('Includes /api/backend?', registerUrl2.includes('/api/backend'))

// Test 3: With custom API URL set correctly
console.log('\n=== Test 3: Custom API URL set correctly ===')
window.CUSTOM_API_URL = 'https://nebula.sabanus.site/api/backend'
const baseUrl3 = getBaseUrl()
console.log('Custom API URL:', window.CUSTOM_API_URL)
console.log('Base URL returned:', baseUrl3)
const registerUrl3 = `${baseUrl3}/auth/register`
console.log('Register URL:', registerUrl3)
console.log('Includes /api/backend?', registerUrl3.includes('/api/backend'))

// Test 4: Check what happens when window is undefined
console.log('\n=== Test 4: Server-side rendering fallback ===')
const originalWindow = global.window
delete global.window
const baseUrl4 = getBaseUrl()
console.log('Base URL (window undefined):', baseUrl4)
const registerUrl4 = `${baseUrl4}/auth/register`
console.log('Register URL (window undefined):', registerUrl4)

// Restore window
global.window = originalWindow

// Test 5: Edge case - custom URL with trailing slash
console.log('\n=== Test 5: Custom URL with trailing slash ===')
window.CUSTOM_API_URL = 'https://nebula.sabanus.site/'
const baseUrl5 = getBaseUrl()
console.log('Custom API URL:', window.CUSTOM_API_URL)
console.log('Base URL returned:', baseUrl5)
const registerUrl5 = `${baseUrl5}/auth/register`
console.log('Register URL:', registerUrl5)
console.log('Includes /api/backend?', registerUrl5.includes('/api/backend'))

// Test 6: Edge case - custom URL with different subpath
console.log('\n=== Test 6: Custom URL with different subpath ===')
window.CUSTOM_API_URL = 'https://api.nebula.sabanus.site/v1'
const baseUrl6 = getBaseUrl()
console.log('Custom API URL:', window.CUSTOM_API_URL)
console.log('Base URL returned:', baseUrl6)
const registerUrl6 = `${baseUrl6}/auth/register`
console.log('Register URL:', registerUrl6)
console.log('Includes /api/backend?', registerUrl6.includes('/api/backend'))

console.log('\n=== Analysis ===')
console.log('The fixed getBaseUrl() function now:')
console.log('1. Always ensures /api/backend is included in the path')
console.log('2. Handles custom URLs that are missing the path')
console.log('3. Properly manages trailing slashes and existing paths')
console.log('4. Prevents API requests from missing the /api/backend segment')