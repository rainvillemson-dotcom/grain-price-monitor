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
      {/* Mobile: stacked; Desktop: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <SmsInput onSaved={fetchRecords} />

        {/* Filter + Table */}
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: '#8b949e' }}>Salvestatud hinnad</p>
          {/* Product filter pills */}
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
      </div>
    </div>
  )
}
