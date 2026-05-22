'use client'

import { useEffect, useState } from 'react'
import { getMarketStatusText, formatCountdown } from '@/lib/marketHours'

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

  // Uuenda staatust iga minuti tagant
  useEffect(() => {
    const id = setInterval(() => setStatus(getMarketStatusText()), 60_000)
    return () => clearInterval(id)
  }, [])

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        {isRefreshing ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3fb950] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3fb950]" />
            </span>
            <span className="text-sm text-[#8b949e]">Laadin…</span>
          </>
        ) : status.isOpen ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3fb950] opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3fb950]" />
            </span>
            <span className="text-sm text-[#3fb950] font-medium">{status.label}</span>
            <span className="text-[#8b949e] text-xs">· {status.detail}</span>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-[#8b949e]" />
            <span className="text-sm text-[#8b949e]">{status.label}</span>
            <span className="text-[#8b949e] text-xs">· {status.detail}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {formattedTime && (
          <span className="text-xs text-[#8b949e]">
            Uuendatud {formattedTime}
            {!isRefreshing && countdown && (
              <> · järgmine {countdown}</>
            )}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-xs text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-40 transition-colors flex items-center gap-1"
          title="Uuenda kohe"
        >
          <svg
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Uuenda
        </button>
      </div>
    </div>
  )
}
