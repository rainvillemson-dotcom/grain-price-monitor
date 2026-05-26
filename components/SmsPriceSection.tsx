'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SmsPriceRecord } from '@/lib/types'
import { SMS_PRODUCTS } from '@/lib/smsProducts'
import SmsInput from './SmsInput'
import SmsTable from './SmsTable'

export default function SmsPriceSection() {
  const [records, setRecords] = useState<SmsPriceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProduct, setFilterProduct] = useState('')
  const [open, setOpen] = useState(false)

  const fetchRecords = useCallback(async () => {
    try {
      const url = filterProduct
        ? `/api/sms?limit=100&product=${encodeURIComponent(filterProduct)}`
        : '/api/sms?limit=100'
      const res = await fetch(url)
      if (res.ok) {
        const json = (await res.json()) as SmsPriceRecord[]
        setRecords(json)
      }
    } finally {
      setLoading(false)
    }
  }, [filterProduct])

  useEffect(() => {
    void fetchRecords()
  }, [fetchRecords])

  async function handleDelete(id: number) {
    const res = await fetch(`/api/sms/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }

  const products = ['', ...SMS_PRODUCTS]

  return (
    <div className="space-y-5">
      {/* Input */}
      <SmsInput onSaved={fetchRecords} />

      {/* Collapsible saved prices */}
      <div className="bg-[#161b22] rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-4 cursor-pointer transition-colors hover:bg-[#1c2128]"
        >
          <span className="text-sm font-medium" style={{ color: '#e6edf3' }}>
            Salvestatud hinnad
            {records.length > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#21262d', color: '#8b949e' }}>
                {records.length}
              </span>
            )}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3">
            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {products.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterProduct(p)}
                  className="touch-target px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer flex items-center"
                  style={
                    filterProduct === p
                      ? { backgroundColor: '#0d1117', border: '1px solid #3fb950', color: '#3fb950' }
                      : { backgroundColor: 'transparent', border: '1px solid #30363d', color: '#8b949e' }
                  }
                >
                  {p || 'Kõik'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="animate-pulse bg-[#21262d] rounded-xl h-48" />
            ) : (
              <SmsTable records={records} onDelete={handleDelete} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
