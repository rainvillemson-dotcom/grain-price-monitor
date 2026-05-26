'use client'

import { useState } from 'react'
import type { ParseResult } from '@/lib/types'
import ParsePreview from './ParsePreview'

interface SmsInputProps {
  onSaved: () => void
}

export default function SmsInput({ onSaved }: SmsInputProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleParse() {
    if (!text.trim()) return
    setIsParsing(true)
    setParseError(null)
    setPreview(null)

    try {
      const res = await fetch('/api/sms/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json()) as ParseResult & { error?: string }
      if (!res.ok) {
        setParseError(data.error ?? 'Parsimine ebaõnnestus')
      } else {
        setPreview(data)
      }
    } catch {
      setParseError('Võrgu viga. Kontrolli ühendust.')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setIsSaving(true)

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      })
      const data = (await res.json()) as { count?: number; error?: string }
      if (!res.ok) {
        setParseError(data.error ?? 'Salvestamine ebaõnnestus')
      } else {
        showToast(`${data.count ?? preview.items.length} hinda salvestatud`)
        setText('')
        setPreview(null)
        onSaved()
        window.dispatchEvent(new CustomEvent('sms-saved'))
      }
    } catch {
      setParseError('Võrgu viga. Kontrolli ühendust.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setPreview(null)
    setParseError(null)
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#0d1117] border border-[#3fb950] text-[#3fb950] rounded-lg px-4 py-3 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <div className="bg-[#161b22] rounded-xl p-4 space-y-3">
        <p className="text-sm" style={{ color: '#8b949e' }}>
          Kirjuta või kopeeri hinnad siia — süsteem tuvastab automaatselt. Formaat ei pea olema täpne.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Sobib igasugune formaat, näiteks:\n\nNisu 210, Oder 185, Raps 505\n\nvõi\n\n210 nisu\n185 oder\n505 raps\n\nvõi kopeeri otse SMS-ist'}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] text-base p-3 resize-none focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
          style={{ minHeight: '180px' }}
        />

        {parseError && (
          <div className="bg-[#2d0f0f] border border-[#f85149] rounded-lg p-3 text-sm text-[#f85149]">
            {parseError}
          </div>
        )}

        <button
          onClick={handleParse}
          disabled={!text.trim() || isParsing}
          className="w-full bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-40 text-white font-semibold rounded-lg transition-colors text-base cursor-pointer"
          style={{ height: 52 }}
        >
          {isParsing ? 'Tuvastan hinnad...' : 'Tuvasta hinnad'}
        </button>
      </div>

      {preview && (
        <ParsePreview
          result={preview}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
