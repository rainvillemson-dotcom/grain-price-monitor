'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SmsPriceRecord } from '@/lib/types'
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

  const products = ['', 'Nisu', 'Raps', 'Oder', 'Kaer', 'Rukis', 'Hernes', 'Uba']

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">SMS Hinnad</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SmsInput onSaved={fetchRecords} />

        <div className="space-y-3">
          {/* Product filter */}
          <div className="flex gap-2 flex-wrap">
            {products.map((p) => (
              <button
                key={p}
                onClick={() => setFilterProduct(p)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filterProduct === p
                    ? 'bg-[#0d1117] border border-[#3fb950] text-[#3fb950]'
                    : 'border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {p || 'Kõik'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="animate-pulse bg-[#21262d] rounded-lg h-48" />
          ) : (
            <SmsTable records={records} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  )
}
