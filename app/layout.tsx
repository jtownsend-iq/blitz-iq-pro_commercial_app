// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BlitzIQ Pro',
  description: 'Engineered to Destroy Egos.',
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/games', label: 'Games' },
  { href: '/scouting', label: 'Scouting' },
  { href: '/players', label: 'Players' },
  { href: '/settings', label: 'Settings' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface text-slate-50`}>
        <div className="min-h-screen flex flex-col">
          {/* Top nav */}
          <header className="border-b border-slate-800 bg-black/60 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-16">
                  <Image
                    src="/blitziq-logo.png"
                    alt="BlitzIQ Pro"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-wide">
                    BlitzIQ Pro
                  </div>
                  <div className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-soft">
                    Engineered to Destroy Egos.
                  </div>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-4 text-xs font-medium">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-1.5 rounded-full text-slate-300 hover:text-slate-50 hover:bg-slate-800/60 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800 bg-black/70">
            <div className="max-w-6xl mx-auto px-4 py-3 text-[0.7rem] text-slate-500 flex justify-between items-center">
              <span>
                © {new Date().getFullYear()} Trips Right, LLC. All rights
                reserved.
              </span>
              <span className="text-slate-400">BlitzIQ Pro™</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
