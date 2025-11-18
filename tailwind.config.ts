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
        // BlitzIQ brand colors
        brand: {
          DEFAULT: '#00E5FF', // cyan from logo
          soft: '#38E8FF',
          dark: '#0891B2'
        },
        surface: {
          DEFAULT: '#020617', // near-black background
          muted: '#020617',
          raised: '#020617'
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
