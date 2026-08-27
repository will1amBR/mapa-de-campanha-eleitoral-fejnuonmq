import { useState, useEffect, useRef, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from './use-auth'
import { useCampaign } from './use-campaign'
import { toast } from 'sonner'

export interface LocationState {
  lat: number
  lng: number
  accuracy?: number
  speed?: number
  battery?: number
  timestamp: number
}

export function useGpsTracker() {
  const { user } = useAuth()
  const { currentCampaign } = useCampaign()
  const [isTracking, setIsTracking] = useState<boolean>(() => {
    return localStorage.getItem('estrategista_is_tracking') === 'true'
  })
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number>(85)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastPushTimeRef = useRef<number>(0)

  // Read device battery if supported
  useEffect(() => {
    const nav = navigator as unknown as {
      getBattery?: () => Promise<{
        level: number
        addEventListener: (t: string, fn: () => void) => void
      }>
    }
    if (nav.getBattery) {
      nav
        .getBattery()
        .then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100))
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100))
          })
        })
        .catch(() => {})
    }
  }, [])

  const pushLocationToBackend = useCallback(
    async (lat: number, lng: number, speed?: number, accuracy?: number) => {
      if (!user || !pb.authStore.isValid) return

      try {
        // Find existing location record or create
        const existing = await pb.collection('team_locations').getList(1, 1, {
          filter: `user_id = "${user.id}"`,
        })

        const payload = {
          user_id: user.id,
          campaign_id: currentCampaign?.id || null,
          lat,
          lng,
          battery: batteryLevel,
          speed: speed ?? 0,
          accuracy: accuracy ?? 0,
          is_active: true,
        }

        if (existing.items.length > 0) {
          await pb.collection('team_locations').update(existing.items[0].id, payload)
        } else {
          await pb.collection('team_locations').create(payload)
        }
        setLastSync(new Date())
        setGpsError(null)
      } catch (err) {
        console.error('Failed to sync GPS location', err)
      }
    },
    [user, currentCampaign, batteryLevel],
  )

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada neste dispositivo.')
      toast.error('Geolocalização não suportada')
      return
    }

    setIsTracking(true)
    localStorage.setItem('estrategista_is_tracking', 'true')
    toast.success('Rastreamento GPS ativado')

    // Get immediate position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const state: LocationState = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed || 0,
          battery: batteryLevel,
          timestamp: pos.timestamp,
        }
        setCurrentLocation(state)
        pushLocationToBackend(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed || 0,
          pos.coords.accuracy,
        )
      },
      (err) => {
        setGpsError(err.message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const state: LocationState = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed || 0,
          battery: batteryLevel,
          timestamp: pos.timestamp,
        }
        setCurrentLocation(state)

        // Throttle backend sync to every 15 seconds
        const now = Date.now()
        if (now - lastPushTimeRef.current > 15000) {
          lastPushTimeRef.current = now
          pushLocationToBackend(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.speed || 0,
            pos.coords.accuracy,
          )
        }
      },
      (err) => {
        setGpsError(err.message)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
  }, [batteryLevel, pushLocationToBackend])

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
    localStorage.setItem('estrategista_is_tracking', 'false')
    toast.info('Rastreamento GPS pausado')

    if (user && pb.authStore.isValid) {
      try {
        const existing = await pb.collection('team_locations').getList(1, 1, {
          filter: `user_id = "${user.id}"`,
        })
        if (existing.items.length > 0) {
          await pb.collection('team_locations').update(existing.items[0].id, { is_active: false })
        }
      } catch {
        // ignore
      }
    }
  }, [user])

  useEffect(() => {
    if (isTracking && !watchIdRef.current) {
      startTracking()
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [isTracking, startTracking])

  return {
    isTracking,
    currentLocation,
    batteryLevel,
    lastSync,
    gpsError,
    startTracking,
    stopTracking,
    syncNow: () => {
      if (currentLocation) {
        pushLocationToBackend(
          currentLocation.lat,
          currentLocation.lng,
          currentLocation.speed,
          currentLocation.accuracy,
        )
      }
    },
  }
}
