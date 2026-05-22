import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { MarketSkeleton, SmsSkeleton, ExchangeSkeleton } from '@/components/Skeletons'

const MarketDashboard = dynamic(() => import('@/components/MarketDashboard'), {
  loading: () => <MarketSkeleton />,
  ssr: false,
})

const ExchangeSection = dynamic(() => import('@/components/ExchangeSection'), {
  loading: () => <ExchangeSkeleton />,
  ssr: false,
})

const SmsPriceSection = dynamic(() => import('@/components/SmsPriceSection'), {
  loading: () => <SmsSkeleton />,
  ssr: false,
})

export default function HomePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Viljahindade Monitor</h1>
          <p className="text-[#8b949e] text-sm mt-1">MATIF turuandmed · SMS hinnad</p>
        </div>
        <span className="text-xs text-[#8b949e] bg-[#161b22] border border-[#30363d] px-2 py-1 rounded">
          v0.1.0
        </span>
      </header>

      <Suspense fallback={<MarketSkeleton />}>
        <MarketDashboard />
      </Suspense>

      <Suspense fallback={<ExchangeSkeleton />}>
        <ExchangeSection />
      </Suspense>

      <Suspense fallback={<SmsSkeleton />}>
        <SmsPriceSection />
      </Suspense>
    </main>
  )
}
