// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // BlitzIQ Pro™ brand colors
        brand: {
          DEFAULT: '#00E5FF', // cyan from logo
          soft: '#38E8FF',
          dark: '#0891B2'
        },
        surface: {
          DEFAULT: '#05070f', // base canvas
          muted: '#0c1324', // subtle cards/inputs
          raised: '#111b33' // elevated cards
        }
      },
      boxShadow: {
        'brand-card': '0 18px 45px rgba(0, 229, 255, 0.18)'
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: []
}

export default config
