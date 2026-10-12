import type { SupabaseClient } from '@supabase/supabase-js'

export type PushResult = 'ok' | 'denied' | 'unsupported'

export function urlBase64ToUint8Array(s: string): Uint8Array<ArrayBuffer> {
  const padded = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function subscribePush(client: SupabaseClient, vapidPublicKey: string | undefined): Promise<PushResult> {
  if (!vapidPublicKey || !pushSupported()) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }))
  const json = sub.toJSON()
  const { error } = await client
    .from('push_subscription')
    .upsert({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(`could not save push subscription: ${error.message}`)
  return 'ok'
}

export async function unsubscribePush(client: SupabaseClient): Promise<void> {
  if (!pushSupported()) return
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
  if (!sub) return
  await client.from('push_subscription').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
