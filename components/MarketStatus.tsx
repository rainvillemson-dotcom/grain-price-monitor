'use client'

import { useEffect, useState } from 'react'
import { getMarketStatusText } from '@/lib/marketHours'

interface MarketStatusProps {
  isRefreshing: boolean
  lastUpdated: Date | null
  countdown: string
  onRefresh: () => void
}

export default function MarketStatus({
  isRefreshing,
  lastUpdated,
  countdown,
  onRefresh,
}: MarketStatusProps) {
  const [status, setStatus] = useState(() => getMarketStatusText())

  useEffect(() => {
    const id = setInterval(() => setStatus(getMarketStatusText()), 60_000)
    return () => clearInterval(id)
  }, [])

  const time = lastUpdated
    ? lastUpdated.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status dot */}
      {isRefreshing ? (
        <span className="flex items-center gap-1.5 text-xs text-[#8b949e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
          Laadin…
        </span>
      ) : status.isOpen ? (
        <span className="flex items-center gap-1.5 text-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3fb950] opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3fb950]" />
          </span>
          <span className="text-[#3fb950] font-medium">Avatud</span>
          <span className="text-[#484f58]">· {status.detail}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-[#8b949e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#484f58]" />
          {status.label} · {status.detail}
        </span>
      )}

      {/* Meta info */}
      {time && (
        <span className="text-[#484f58] text-xs">
          {time}
          {!isRefreshing && countdown && <> · {countdown}</>}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="text-[#484f58] hover:text-[#8b949e] disabled:opacity-40 transition-colors text-xs"
        title="Uuenda"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className={isRefreshing ? 'animate-spin' : ''}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}
