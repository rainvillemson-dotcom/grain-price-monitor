'use client'

import { useState } from 'react'
import BottomTabs from './BottomTabs'

interface TabShellProps {
  hinnadContent: React.ReactNode
  borsContent: React.ReactNode
  lisaContent: React.ReactNode
}

export default function TabShell({ hinnadContent, borsContent, lisaContent }: TabShellProps) {
  const [activeTab, setActiveTab] = useState('hinnad')

  return (
    <>
      {/* Desktop: all sections visible, stacked normally */}
      <div className="hidden md:block max-w-7xl mx-auto px-6">
        <section className="py-8">{hinnadContent}</section>
        <div className="border-t border-[#21262d]" />
        <section className="py-8">{borsContent}</section>
        <div className="border-t border-[#21262d]" />
        <section className="py-8">{lisaContent}</section>
      </div>

      {/* Mobile: single tab shown at a time */}
      <div className="md:hidden">
        <div
          className="px-4 overflow-y-auto"
          style={{ minHeight: 'calc(100vh - 48px - 56px)', paddingBottom: '24px', paddingTop: '20px' }}
        >
          {activeTab === 'hinnad' && hinnadContent}
          {activeTab === 'bors' && borsContent}
          {activeTab === 'lisa' && lisaContent}
        </div>

        <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </>
  )
}
