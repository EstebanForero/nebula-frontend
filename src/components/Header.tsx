import { Link } from '@tanstack/react-router'

import { useState, useEffect } from 'react'
import { Home, Menu, X, Settings } from 'lucide-react'
import { setCustomApiUrl, setCustomNotificationUrl } from '../lib/api'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [apiUrl, setApiUrl] = useState('')
  const [notificationUrl, setNotificationUrl] = useState('')

  // Initialize with default values when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiUrl(`${window.location.origin}/api/backend`)
      setNotificationUrl(`${window.location.origin}/api/notifications`)
    }
  }, [])

  const handleApiUrlSave = () => {
    console.log('💾 Saving API configuration:')
    console.log('  📝 API URL input:', apiUrl)
    console.log('  📝 Notification URL input:', notificationUrl)

    // Get default values for comparison
    const defaultApiUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/backend` : ''
    const defaultNotificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications` : ''

    // Only set custom API URL if it's different from default
    if (apiUrl.trim() && apiUrl.trim() !== defaultApiUrl) {
      console.log('  ✅ Setting custom API URL to:', apiUrl.trim())
      setCustomApiUrl(apiUrl.trim())
    } else {
      console.log('  📝 Using default API URL (or empty), clearing custom URL')
      if ((window as any).CUSTOM_API_URL) {
        delete (window as any).CUSTOM_API_URL
      }
    }

    // Only set custom notification URL if it's different from default
    if (notificationUrl.trim() && notificationUrl.trim() !== defaultNotificationUrl) {
      console.log('  ✅ Setting custom notification URL to:', notificationUrl.trim())
      setCustomNotificationUrl(notificationUrl.trim())
    } else {
      console.log('  📝 Using default notification URL (or empty), clearing custom URL')
      if ((window as any).CUSTOM_NOTIFICATION_URL) {
        delete (window as any).CUSTOM_NOTIFICATION_URL
      }
    }

    setShowApiSettings(false)
  }

  return (
    <>
      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <button
          onClick={() => setShowApiSettings(true)}
          className="ml-2 p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="API Settings"
          title="Configure API Endpoints"
        >
          <Settings size={24} />
        </button>
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/">
            <img
              src="/tanstack-word-logo-white.svg"
              alt="TanStack Logo"
              className="h-10"
            />
          </Link>
        </h1>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          {/* Demo Links Start */}

          {/* Demo Links End */}
        </nav>
      </aside>

      {/* API Settings Modal */}
      {showApiSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">API Configuration</h3>

            <div className="mb-4">
              <label htmlFor="api-url" className="block text-sm font-medium mb-2">
                Backend API URL
              </label>
              <input
                id="api-url"
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/backend`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: {typeof window !== 'undefined' ? `${window.location.origin}/api/backend` : '/api/backend'}
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="notification-url" className="block text-sm font-medium mb-2">
                Notification Service URL
              </label>
              <input
                id="notification-url"
                type="text"
                value={notificationUrl}
                onChange={(e) => setNotificationUrl(e.target.value)}
                placeholder={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/notifications`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: {typeof window !== 'undefined' ? `${window.location.origin}/api/notifications` : '/api/notifications'}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowApiSettings(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApiUrlSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
