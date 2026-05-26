'use client'

interface BottomTabsProps {
  activeTab: string
  onChange: (tab: string) => void
}

const tabs = [
  {
    key: 'hinnad',
    label: 'Hinnad',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: 'bors',
    label: 'Börshinnad',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="10" width="4" height="11" rx="1" />
        <rect x="10" y="4" width="4" height="17" rx="1" />
        <rect x="18" y="7" width="4" height="14" rx="1" />
      </svg>
    ),
  },
  {
    key: 'lisa',
    label: 'Lisa hind',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="12" y1="9" x2="12" y2="15" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </svg>
    ),
  },
]

export default function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex-1 flex flex-col items-center justify-center gap-1 touch-target transition-colors cursor-pointer"
              style={{
                height: 68,
                color: isActive ? '#3fb950' : '#6e7681',
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon}
              <span className="text-[11px] font-medium leading-tight text-center">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
