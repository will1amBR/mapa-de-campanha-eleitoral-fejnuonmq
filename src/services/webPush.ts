import pb from '@/lib/pocketbase/client'

export interface PushSubscriptionRecord {
  id: string
  user_id?: string
  campaign_id?: string
  endpoint: string
  p256dh: string
  auth_key: string
  user_agent?: string
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'unknown'
  is_active: boolean
  created: string
  updated: string
}

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

// Public VAPID key (Standard P-256 Public Key for browser subscription)
// Can be customized or overridden via environment or standard VAPID generation
export const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nysh8U'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }
  if (/ipad|tablet/i.test(ua)) {
    return 'tablet'
  }
  return 'desktop'
}

export const webPushService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  },

  getPermissionState(): PushPermissionState {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission as PushPermissionState
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      return reg
    } catch (err) {
      console.warn('Service Worker registration failed:', err)
      return null
    }
  },

  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null
    try {
      const reg = await navigator.serviceWorker.ready
      return await reg.pushManager.getSubscription()
    } catch {
      return null
    }
  },

  async subscribeUser(campaignId?: string): Promise<{
    success: boolean
    subscription?: PushSubscriptionRecord
    error?: string
  }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Notificações push não são suportadas neste navegador.' }
    }

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        return {
          success: false,
          error:
            permission === 'denied'
              ? 'Permissão bloqueada pelo usuário. Desbloqueie nas configurações do navegador.'
              : 'Permissão de notificação não foi concedida.',
        }
      }

      // 2. Ensure Service Worker is registered
      let reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        reg = (await this.registerServiceWorker()) || undefined
      }
      if (!reg) {
        return { success: false, error: 'Falha ao inicializar o Service Worker.' }
      }

      await navigator.serviceWorker.ready

      // 3. Get or create subscription
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        })
      }

      // 4. Extract keys
      const p256dhKey = sub.getKey('p256dh')
      const authKey = sub.getKey('auth')

      const p256dh = p256dhKey
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey))))
        : ''
      const auth_key = authKey
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey))))
        : ''

      const endpoint = sub.endpoint
      const userId = pb.authStore.model?.id
      const deviceType = detectDeviceType()
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

      // 5. Persist to PocketBase push_subscriptions collection
      let savedRecord: PushSubscriptionRecord

      try {
        const existing = await pb
          .collection('push_subscriptions')
          .getFirstListItem<PushSubscriptionRecord>(`endpoint = "${endpoint}"`)
        savedRecord = await pb
          .collection('push_subscriptions')
          .update<PushSubscriptionRecord>(existing.id, {
            user_id: userId || existing.user_id,
            campaign_id: campaignId || existing.campaign_id,
            p256dh: p256dh || existing.p256dh,
            auth_key: auth_key || existing.auth_key,
            user_agent: userAgent,
            device_type: deviceType,
            is_active: true,
          })
      } catch {
        // Create new record
        savedRecord = await pb.collection('push_subscriptions').create<PushSubscriptionRecord>({
          user_id: userId || undefined,
          campaign_id: campaignId || undefined,
          endpoint,
          p256dh,
          auth_key,
          user_agent: userAgent,
          device_type: deviceType,
          is_active: true,
        })
      }

      // Show local test notification to confirm activation
      if (reg.showNotification) {
        reg.showNotification('Notificações Ativadas!', {
          body: 'Você receberá alertas de virada e oscilações críticas de pesquisa no celular.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        })
      }

      return { success: true, subscription: savedRecord }
    } catch (err: any) {
      console.error('Error subscribing to push:', err)
      return { success: false, error: err?.message || 'Erro ao registrar assinatura push.' }
    }
  },

  async unsubscribeUser(): Promise<boolean> {
    try {
      if (this.isSupported()) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          const endpoint = sub.endpoint
          await sub.unsubscribe()

          try {
            const existing = await pb
              .collection('push_subscriptions')
              .getFirstListItem<PushSubscriptionRecord>(`endpoint = "${endpoint}"`)
            await pb.collection('push_subscriptions').update(existing.id, { is_active: false })
          } catch {
            // ignore
          }
        }
      }
      return true
    } catch (err) {
      console.warn('Error unsubscribing push:', err)
      return false
    }
  },

  /**
   * Dispatches push notification via backend endpoint
   */
  async dispatchPushNotification(payload: {
    campaign_id?: string
    title: string
    body: string
    url?: string
    tag?: string
  }): Promise<{ success: boolean; sent?: number; failed?: number }> {
    try {
      const res = await pb.send('/backend/v1/push/send', {
        method: 'POST',
        body: payload,
      })
      return res
    } catch (err) {
      console.warn('Backend push dispatch fallback:', err)

      // Fallback local dispatch via SW if browser is running
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          if (reg && Notification.permission === 'granted') {
            const notifOpts: any = {
              body: payload.body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              vibrate: [200, 100, 200],
              data: { url: payload.url || '/polls' },
            }
            reg.showNotification(payload.title, notifOpts)
            return { success: true, sent: 1 }
          }
        }
      } catch {
        /* intentionally ignored */
      }

      return { success: false }
    }
  },
}
