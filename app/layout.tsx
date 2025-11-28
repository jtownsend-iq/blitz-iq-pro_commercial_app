// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: {
    default: 'BlitzIQ',
    template: '%s | BlitzIQ',
  },
  description: 'Engineered to destroy egos with fast, confident charting.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'BlitzIQ',
    title: 'BlitzIQ',
    description: 'Engineered to destroy egos with fast, confident charting.',
    url: 'https://blitziq.com',
    images: [
      {
        url: 'https://blitziq.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BlitzIQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlitzIQ',
    description: 'Engineered to destroy egos with fast, confident charting.',
    images: ['https://blitziq.com/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${spaceGrotesk.variable} bg-surface text-slate-50 antialiased selection:bg-brand/30`}>
        {children}
      </body>
    </html>
  )
}
