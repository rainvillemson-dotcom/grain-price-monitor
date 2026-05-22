'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { ExchangeResponse } from '@/lib/exchange'
import { loadExchangePrefs, saveExchangePrefs } from './ExchangeFilter'
import ExchangeCard from './ExchangeCard'

const ExchangeFilter = dynamic(() => import('./ExchangeFilter'), { ssr: false })
const ExchangeCharts = dynamic(() => import('./ExchangeCharts'), { ssr: false })

function ExchangeSectionSkeleton() {
  function Pulse({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#21262d] rounded ${className ?? ''}`} />
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Pulse className="h-6 w-48" />
      </div>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
        <Pulse className="h-20 w-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-7 w-20" />
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <Pulse className="h-48 w-full" />
      </div>
    </div>
  )
}

interface RefreshResponse {
  ok?: boolean
  updated?: number
  updatedAt?: string
  error?: string
  nextAllowed?: string
}

export default function ExchangeSection() {
  const [data, setData] = useState<ExchangeResponse | null>(null)
  const [period, setPeriod] = useState('1y')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Load prefs from localStorage on mount (client-only)
  useEffect(() => {
    setSelected(loadExchangePrefs())
  }, [])

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/exchange?period=${p}`)
      if (!res.ok) {
        const json = (await res.json()) as { error: string }
        throw new Error(json.error ?? 'Laadimine ebaõnnestus')
      }
      const json = (await res.json()) as ExchangeResponse
      setData(json)
      setLastUpdated(json.updatedAt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Viga')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(period)
  }, [fetchData, period])

  const handlePeriodChange = (p: string) => {
    setPeriod(p)
  }

  const handleFilterChange = (ticker: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(ticker)
      } else {
        next.delete(ticker)
      }
      saveExchangePrefs(next)
      return next
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRateLimitMsg(null)
    try {
      const res = await fetch('/api/exchange/refresh', { method: 'POST' })
      const json = (await res.json()) as RefreshResponse

      if (res.status === 429) {
        // Rate limited
        const nextAllowed = json.nextAllowed ? new Date(json.nextAllowed) : null
        if (nextAllowed) {
          const diffMs = nextAllowed.getTime() - Date.now()
          const diffMin = Math.ceil(diffMs / 60000)
          setRateLimitMsg(`Oota ${diffMin} min`)
        } else {
          setRateLimitMsg('Oota 15 minutit')
        }
        return
      }

      if (json.ok) {
        setLastUpdated(json.updatedAt ?? null)
        // Re-fetch to get updated data
        await fetchData(period)
      } else if (json.error) {
        setError(json.error)
      }
    } catch {
      setError('Uuendamine ebaõnnestus')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (loading && !data) {
    return <ExchangeSectionSkeleton />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-[#e6edf3]">
          Börsihinnad{' '}
          <span className="text-[#8b949e] text-sm font-normal">· 15-min hilinemine</span>
        </h2>
      </div>

      {error && (
        <div className="bg-[#2d0f0f] border border-[#f85149] rounded-lg p-3 text-[#f85149] text-sm">
          {error}
        </div>
      )}

      <ExchangeFilter selected={selected} onChange={handleFilterChange} />

      {data && (
        <>
          {/* Price cards — only selected instruments */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.instruments
              .filter((inst) => selected.has(inst.ticker))
              .map((inst) => (
                <ExchangeCard key={inst.ticker} instrument={inst} />
              ))}
          </div>

          <ExchangeCharts
            instruments={data.instruments}
            period={period}
            onPeriodChange={handlePeriodChange}
            selected={selected}
          />
        </>
      )}

      {/* Footer: refresh button + last updated */}
      <div className="flex items-center justify-end gap-3">
        {rateLimitMsg && (
          <span className="text-[#8b949e] text-xs">{rateLimitMsg}</span>
        )}
        {lastUpdated && !rateLimitMsg && (
          <span className="text-[#8b949e] text-xs">Uuendati {lastUpdated}</span>
        )}
        <button
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition-colors ${
            isRefreshing
              ? 'border-[#30363d] text-[#484f58] cursor-not-allowed'
              : 'border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#8b949e]'
          }`}
        >
          <span className={isRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
          Uuenda
        </button>
      </div>
    </div>
  )
}
