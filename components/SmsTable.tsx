'use client'

import type { SmsPriceRecord } from '@/lib/types'
import { formatIsoDate } from '@/lib/date'

const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
  Scandagra: { bg: '#1a3a1a', text: '#3fb950' },
  'Baltic Agro': { bg: '#131c2e', text: '#58a6ff' },
  Kevili: { bg: '#2d1f00', text: '#d29922' },
  Viljaekspert: { bg: '#2d1a1a', text: '#f0883e' },
  Muu: { bg: '#21262d', text: '#8b949e' },
}

interface SmsTableProps {
  records: SmsPriceRecord[]
  onDelete: (id: number) => void
}

export default function SmsTable({ records, onDelete }: SmsTableProps) {
  if (records.length === 0) {
    return (
      <div className="bg-[#161b22] rounded-xl p-8 text-center text-[#8b949e] text-sm">
        Ühtegi hinda pole veel lisatud
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d]">
              {/* Kuupäev hidden on mobile */}
              <th className="hidden sm:table-cell text-left px-3 py-2 text-[#8b949e] font-medium">Kuupäev</th>
              <th className="text-left px-3 py-2 text-[#8b949e] font-medium">Allikas</th>
              <th className="text-left px-3 py-2 text-[#8b949e] font-medium">Toode</th>
              <th className="text-left px-3 py-2 text-[#8b949e] font-medium">Hind</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const badge = SOURCE_BADGE[r.source] ?? SOURCE_BADGE['Muu']
              const formattedDate = formatIsoDate(r.date, 'et-EE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
              return (
                <tr key={r.id} className="border-b border-[#21262d] hover:bg-[#0d1117] transition-colors">
                  {/* Kuupäev hidden on mobile */}
                  <td className="hidden sm:table-cell px-3 py-3 text-sm text-[#8b949e]">{formattedDate}</td>
                  <td className="px-3 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {r.source}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-[#e6edf3]">{r.product}</td>
                  <td className="px-3 py-3 text-sm text-[#e6edf3] font-semibold num">
                    {r.price} {r.unit}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => onDelete(r.id)}
                      className="touch-target flex items-center justify-center text-[#484f58] hover:text-[#f85149] transition-colors cursor-pointer"
                      aria-label="Kustuta kirje"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
