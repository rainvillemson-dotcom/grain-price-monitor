'use client'

function Pulse({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#21262d] rounded ${className ?? ''}`} />
  )
}

export function MarketSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
            <Pulse className="h-4 w-32" />
            <Pulse className="h-8 w-24" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <Pulse className="h-64 w-full" />
      </div>
    </div>
  )
}

export function ExchangeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Pulse className="h-6 w-48" />
      </div>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
        <Pulse className="h-20 w-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-7 w-20" />
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <Pulse className="h-48 w-full" />
      </div>
    </div>
  )
}

export function SmsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <Pulse className="h-32 w-full" />
      </div>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <Pulse className="h-48 w-full" />
      </div>
    </div>
  )
}
