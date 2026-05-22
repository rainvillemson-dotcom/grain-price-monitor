import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Viljahindade Monitor',
  description: 'Eesti viljahindade jälgimine – MATIF turuandmed ja SMS hinnad',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#3fb950',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
