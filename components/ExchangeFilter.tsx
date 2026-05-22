'use client'

import { useState, useEffect } from 'react'
import { EXCHANGE_INSTRUMENTS } from '@/lib/exchange'

interface ExchangeFilterProps {
  selected: Set<string>
  onChange: (ticker: string, checked: boolean) => void
}

const GROUPS: { key: string; label: string }[] = [
  { key: 'matif', label: 'MATIF' },
  { key: 'cbot',  label: 'CBOT' },
  { key: 'oil',   label: 'WTI' },
  { key: 'fx',    label: 'FX' },
]

const STORAGE_KEY = 'exchangePrefs'

export function loadExchangePrefs(): Set<string> {
  if (typeof window === 'undefined') return new Set(EXCHANGE_INSTRUMENTS.map((i) => i.ticker))
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set(EXCHANGE_INSTRUMENTS.map((i) => i.ticker))
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return new Set(parsed as string[])
    }
  } catch { /* ignore */ }
  return new Set(EXCHANGE_INSTRUMENTS.map((i) => i.ticker))
}

export function saveExchangePrefs(selected: Set<string>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected))) }
  catch { /* ignore */ }
}

export default function ExchangeFilter({ selected, onChange }: ExchangeFilterProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => { saveExchangePrefs(selected) }, [selected])

  const selectedCount = selected.size
  const totalCount = EXCHANGE_INSTRUMENTS.length

  return (
    <div>
      {/* Trigger — compact single line */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Instrumendid</span>
        <span className="text-[#484f58]">
          {selectedCount === totalCount ? 'kõik' : `${selectedCount}/${totalCount}`}
        </span>
        {/* Colored dots showing active groups */}
        <span className="flex gap-1 ml-1">
          {EXCHANGE_INSTRUMENTS.map((inst) => (
            <span
              key={inst.ticker}
              className="w-1.5 h-1.5 rounded-full transition-opacity"
              style={{
                backgroundColor: inst.color,
                opacity: selected.has(inst.ticker) ? 1 : 0.2,
              }}
            />
          ))}
        </span>
      </button>

      {/* Expandable panel */}
      {open && (
        <div className="mt-3 bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {GROUPS.map((group) => {
              const instruments = EXCHANGE_INSTRUMENTS.filter((i) => i.group === group.key)
              if (!instruments.length) return null
              return (
                <div key={group.key}>
                  <p className="text-[#484f58] text-[10px] font-medium uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {instruments.map((inst) => {
                      const checked = selected.has(inst.ticker)
                      return (
                        <label key={inst.ticker} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onChange(inst.ticker, e.target.checked)}
                            className="sr-only"
                          />
                          <span
                            className="w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-all"
                            style={checked
                              ? { backgroundColor: inst.color, borderColor: inst.color }
                              : { borderColor: '#30363d', backgroundColor: '#0d1117' }
                            }
                          >
                            {checked && (
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="#0d1117" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="text-xs transition-colors" style={{ color: checked ? inst.color : '#8b949e' }}>
                            {inst.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 mt-4 pt-3 border-t border-[#21262d]">
            <button
              onClick={() => EXCHANGE_INSTRUMENTS.forEach((i) => onChange(i.ticker, true))}
              className="text-[10px] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              Vali kõik
            </button>
            <button
              onClick={() => EXCHANGE_INSTRUMENTS.forEach((i) => onChange(i.ticker, false))}
              className="text-[10px] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              Tühista
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
