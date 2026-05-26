'use client'

import type { ParseResult } from '@/lib/types'
import { formatIsoDate } from '@/lib/date'

interface ParsePreviewProps {
  result: ParseResult
  onConfirm: () => void
  onCancel: () => void
  isSaving: boolean
}

export default function ParsePreview({ result, onConfirm, onCancel, isSaving }: ParsePreviewProps) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
      <h3 className="font-semibold text-[#e6edf3]">Eelvaade</h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-[#8b949e]">Allikas</span>
        <span className="text-[#e6edf3] flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3fb950] inline-block" />
          {result.source}
        </span>
        <span className="text-[#8b949e]">Kuupäev</span>
        <span className="text-[#e6edf3]">
          {formatIsoDate(result.date, 'et-EE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d]">
              <th className="text-left py-2 text-[#8b949e] font-medium">Toode</th>
              <th className="text-left py-2 text-[#8b949e] font-medium">Hind</th>
              <th className="text-left py-2 text-[#8b949e] font-medium">Staatus</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, i) => {
              const isUnusual = item.price < 50 || item.price > 2000
              return (
                <tr key={i} className="border-b border-[#21262d]">
                  <td className="py-2 text-[#e6edf3]">{item.product}</td>
                  <td className="py-2 text-[#e6edf3]">
                    {item.price} {item.unit}
                  </td>
                  <td className="py-2">
                    {isUnusual ? (
                      <span className="text-[#d29922]" title="Ebatavaline hind">⚠</span>
                    ) : (
                      <span className="text-[#3fb950]">✓</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {result.warnings && result.warnings.length > 0 && (
        <div className="bg-[#2d2100] border border-[#d29922] rounded p-3 text-sm text-[#d29922]">
          {result.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isSaving}
          className="flex-1 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-medium py-2 rounded transition-colors text-sm"
        >
          {isSaving ? 'Salvestamine...' : `Salvesta ${result.items.length} hinda`}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-medium py-2 rounded transition-colors text-sm border border-[#30363d]"
        >
          Tühista
        </button>
      </div>
    </div>
  )
}
