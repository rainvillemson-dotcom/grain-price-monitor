import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { MarketSkeleton, SmsSkeleton } from '@/components/Skeletons'
import TabShell from '@/components/TabShell'

const MarketDashboard = dynamic(() => import('@/components/MarketDashboard'), {
  loading: () => <MarketSkeleton />,
  ssr: false,
})

const SmsPriceSection = dynamic(() => import('@/components/SmsPriceSection'), {
  loading: () => <SmsSkeleton />,
  ssr: false,
})

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-[#0d1117]/90 backdrop-blur-sm border-b border-[#21262d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#e6edf3] tracking-tight">
            Viljahindade Monitor
          </span>
          <span className="text-xs text-[#484f58]">Eesti · EUR/t</span>
        </div>
      </header>

      <TabShell
        hinnadContent={
          <Suspense fallback={<MarketSkeleton />}>
            <MarketDashboard />
          </Suspense>
        }
        lisaContent={
          <Suspense fallback={<SmsSkeleton />}>
            <SmsPriceSection />
          </Suspense>
        }
      />
    </div>
  )
}
