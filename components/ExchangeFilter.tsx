'use client'

import { useEffect } from 'react'
import { EXCHANGE_INSTRUMENTS } from '@/lib/exchange'

interface ExchangeFilterProps {
  selected: Set<string>
  onChange: (ticker: string, checked: boolean) => void
}

const GROUPS: { key: string; label: string }[] = [
  { key: 'matif', label: 'MATIF' },
  { key: 'cbot',  label: 'CBOT' },
  { key: 'oil',   label: 'WTI' },
  { key: 'fx',    label: 'Valuuta' },
]

const STORAGE_KEY = 'exchangePrefs'

export function loadExchangePrefs(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(EXCHANGE_INSTRUMENTS.map((i) => i.ticker))
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set(EXCHANGE_INSTRUMENTS.map((i) => i.ticker))
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return new Set(parsed as string[])
    }
  } catch {
    // Ignore parse errors
  }
  return new Set(EXCHANGE_INSTRUMENTS.map((i) => i.ticker))
}

export function saveExchangePrefs(selected: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected)))
  } catch {
    // Ignore storage errors
  }
}

export default function ExchangeFilter({ selected, onChange }: ExchangeFilterProps) {
  // Persist on every change
  useEffect(() => {
    saveExchangePrefs(selected)
  }, [selected])

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {GROUPS.map((group) => {
          const instruments = EXCHANGE_INSTRUMENTS.filter((i) => i.group === group.key)
          if (instruments.length === 0) return null

          return (
            <div key={group.key}>
              <p className="text-[#8b949e] text-xs font-medium mb-1.5 uppercase tracking-wide">
                {group.label}
              </p>
              <div className="space-y-1">
                {instruments.map((inst) => {
                  const checked = selected.has(inst.ticker)
                  return (
                    <label
                      key={inst.ticker}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(inst.ticker, e.target.checked)}
                        className="sr-only"
                      />
                      {/* Custom checkbox */}
                      <span
                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'border-transparent' : 'border-[#30363d] bg-[#0d1117]'
                        }`}
                        style={checked ? { backgroundColor: inst.color, borderColor: inst.color } : {}}
                        aria-hidden="true"
                      >
                        {checked && (
                          <svg
                            width="9"
                            height="7"
                            viewBox="0 0 9 7"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M1 3L3.5 5.5L8 1"
                              stroke="#0d1117"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className="text-xs transition-colors"
                        style={{ color: checked ? inst.color : '#8b949e' }}
                      >
                        {inst.label}
                      </span>
                      <span className="text-[#484f58] text-xs font-mono ml-auto">
                        {inst.ticker}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
