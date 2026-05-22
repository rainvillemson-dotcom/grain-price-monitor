'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MarketResponse, SmsPriceRecord } from '@/lib/types'
import PriceCard from './PriceCard'
import PriceChart from './PriceChart'
import { MarketSkeleton } from './Skeletons'

export default function MarketDashboard() {
  const [data, setData] = useState<MarketResponse | null>(null)
  const [smsData, setSmsData] = useState<SmsPriceRecord[]>([])
  const [period, setPeriod] = useState('3mo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/market?period=${p}`)
      if (!res.ok) throw new Error('Turuandmete laadimine ebaõnnestus')
      const json = (await res.json()) as MarketResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Viga')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSms = useCallback(async () => {
    try {
      const res = await fetch('/api/sms?limit=200')
      if (res.ok) {
        const json = (await res.json()) as SmsPriceRecord[]
        setSmsData(json)
      }
    } catch {
      // SMS andmed pole kriitilised
    }
  }, [])

  useEffect(() => {
    void fetchMarket(period)
    void fetchSms()
  }, [fetchMarket, fetchSms, period])

  useEffect(() => {
    const handler = () => void fetchSms()
    window.addEventListener('sms-saved', handler)
    return () => window.removeEventListener('sms-saved', handler)
  }, [fetchSms])

  if (loading) return <MarketSkeleton />

  if (error) {
    return (
      <div className="bg-[#2d0f0f] border border-[#f85149] rounded-lg p-4 text-[#f85149] text-sm">
        {error}
      </div>
    )
  }

  if (!data) return null

  // All grain series (including rapeseed which may have no chart data)
  const grainSeries = data.series.filter((s) => s.ticker !== 'EURUSD=X')
  const chartSeries = [
    ...grainSeries,
    { ...data.eurusd, ticker: 'EURUSD=X', label: 'EUR/USD', color: '#58a6ff', latest: data.eurusd.latest },
  ]

  return (
    <div className="space-y-4">
      {/* Price cards */}
      <div className="grid grid-cols-2 gap-3">
        {grainSeries.map((s) => (
          <PriceCard key={s.ticker} ticker={s.ticker} label={s.label} latest={s.latest} />
        ))}
        <PriceCard
          key="EURUSD=X"
          ticker="EURUSD=X"
          label="EUR/USD"
          latest={data.eurusd.latest}
          unit=""
        />
      </div>

      {/* Chart — grain with historical data + EUR/USD */}
      <PriceChart
        matifData={chartSeries}
        smsData={smsData}
        period={period}
        onPeriodChange={setPeriod}
      />
    </div>
  )
}
