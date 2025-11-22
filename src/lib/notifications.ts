import { subscribeWebPush, type WebPushSubscription } from './api'

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || ''

export async function requestNotificationPermission() {
  if (!('Notification' in window)) throw new Error('Notifications are not supported in this browser')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission not granted')
  return permission
}

export async function registerServiceWorker(swPath = '/service-worker.js') {
  if (!('serviceWorker' in navigator)) throw new Error('Service worker not supported')
  return navigator.serviceWorker.register(swPath)
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    if (!VAPID_PUBLIC_KEY) throw new Error('Missing VAPID public key')
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    })
  }
  return subscription.toJSON() as WebPushSubscription
}

export async function enablePush({
  token,
  baseUrl,
  notificationBaseUrl,
}: {
  token: string
  baseUrl?: string
  notificationBaseUrl?: string
}) {
  await requestNotificationPermission()
  await registerServiceWorker()
  const subscription = await getPushSubscription()
  return subscribeWebPush(subscription, { token, baseUrl, notificationBaseUrl })
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
