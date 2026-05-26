'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getRefreshInterval, formatCountdown } from '@/lib/marketHours'

interface UseAutoRefreshResult {
  countdown: string
  lastUpdated: Date | null
  isRefreshing: boolean
  triggerRefresh: () => void
}

export function useAutoRefresh(onRefresh: () => Promise<void>): UseAutoRefreshResult {
  const [countdown, setCountdown] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsRef = useRef(0)
  const lastUpdatedRef = useRef<Date | null>(null)

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countRef.current) clearInterval(countRef.current)
  }, [])

  const doRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
      const now = new Date()
      lastUpdatedRef.current = now
      setLastUpdated(now)
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  const scheduleNext = useCallback(() => {
    clearTimers()
    const interval = getRefreshInterval()
    secondsRef.current = Math.floor(interval / 1000)
    setCountdown(formatCountdown(secondsRef.current))

    countRef.current = setInterval(() => {
      secondsRef.current = Math.max(0, secondsRef.current - 1)
      setCountdown(formatCountdown(secondsRef.current))
    }, 1000)

    timerRef.current = setTimeout(() => {
      doRefresh().then(scheduleNext)
    }, interval)
  }, [clearTimers, doRefresh])

  const triggerRefresh = useCallback(() => {
    doRefresh().then(scheduleNext)
  }, [doRefresh, scheduleNext])

  useEffect(() => {
    // Kohene fetch lehe avamisel
    doRefresh().then(scheduleNext)

    // Vaheleht muutub nähtavaks → uuenda kohe
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = lastUpdatedRef.current
          ? (Date.now() - lastUpdatedRef.current.getTime()) / 1000
          : Infinity
        // Uuenda ainult kui eelmisest uuendusest on möödunud >14 min
        if (elapsed > 14 * 60) {
          doRefresh().then(scheduleNext)
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimers()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { countdown, lastUpdated, isRefreshing, triggerRefresh }
}
