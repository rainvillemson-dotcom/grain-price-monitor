'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { ExchangeResponse } from '@/lib/exchange'
import { loadExchangePrefs, saveExchangePrefs } from './ExchangeFilter'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import ExchangeCard from './ExchangeCard'
import MarketStatus from './MarketStatus'

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
        <Pulse className="h-4 w-32" />
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

export default function ExchangeSection() {
  const [data, setData] = useState<ExchangeResponse | null>(null)
  const [period, setPeriod] = useState('1y')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected(loadExchangePrefs())
  }, [])

  const fetchData = useCallback(async (p: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/exchange?period=${p}`)
      if (!res.ok) {
        const json = (await res.json()) as { error: string }
        throw new Error(json.error ?? 'Laadimine ebaõnnestus')
      }
      const json = (await res.json()) as ExchangeResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Viga')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh hook — fetchi /api/exchange/refresh siis /api/exchange
  const doRefresh = useCallback(async () => {
    try {
      // Proovi POST refresh (upsert DB)
      await fetch('/api/exchange/refresh', { method: 'POST' })
    } catch {
      // Ignoreeri rate limit või võrgu vigu — fetchData teeb igal juhul
    }
    await fetchData(period)
  }, [fetchData, period])

  const { countdown, lastUpdated, isRefreshing, triggerRefresh } = useAutoRefresh(doRefresh)

  // Periood muutub → lae uued andmed
  useEffect(() => {
    void fetchData(period)
  }, [fetchData, period])

  const handleFilterChange = (ticker: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(ticker)
      else next.delete(ticker)
      saveExchangePrefs(next)
      return next
    })
  }

  if (loading && !data) {
    return <ExchangeSectionSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Päis: pealkiri + börsiaeg + uuendusinfo */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[#e6edf3]">Börsihinnad</h2>
        <MarketStatus
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          countdown={countdown}
          onRefresh={triggerRefresh}
        />
      </div>

      {error && (
        <div className="bg-[#2d0f0f] border border-[#f85149] rounded-lg p-3 text-[#f85149] text-sm">
          {error}
        </div>
      )}

      <ExchangeFilter selected={selected} onChange={handleFilterChange} />

      {data && (
        <>
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
            onPeriodChange={setPeriod}
            selected={selected}
          />
        </>
      )}
    </div>
  )
}
