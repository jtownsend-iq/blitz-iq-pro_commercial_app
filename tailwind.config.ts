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
      container: {
        center: true,
        padding: {
          DEFAULT: '1.25rem',
          lg: '2rem',
          xl: '2.5rem',
        },
        screens: {
          '2xl': '1280px',
          '3xl': '1440px',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-space)', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2rem' }],
        sm: ['0.875rem', { lineHeight: '1.4rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.6rem' }],
      },
      spacing: {
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
      },
      colors: {
        // BlitzIQ Pro brand colors
        brand: {
          DEFAULT: '#00E5FF', // cyan from logo
          soft: '#38E8FF',
          dark: '#0891B2'
        },
        surface: {
          DEFAULT: '#05070f', // base canvas
          muted: '#0c1324', // subtle cards/inputs
          raised: '#111b33' // elevated cards
        },
        'bg-surface': '#05070f',
      },
      boxShadow: {
        surface: '0 8px 24px rgba(0, 0, 0, 0.35)',
        card: '0 12px 32px rgba(0, 0, 0, 0.45)',
        popover: '0 18px 45px rgba(0, 0, 0, 0.5)',
        modal: '0 24px 65px rgba(0, 0, 0, 0.6)',
        'brand-card': '0 18px 45px rgba(0, 229, 255, 0.18)',
        focus: '0 0 0 4px rgba(0, 229, 255, 0.18)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem'
      },
      backgroundImage: {
        'hero-radial': 'radial-gradient(circle at 20% 20%, rgba(0,229,255,0.12), transparent 35%), radial-gradient(circle at 80% 0%, rgba(134,239,255,0.08), transparent 30%), linear-gradient(180deg, #070a14 0%, #04060d 45%, #02040a 100%)',
        'surface-glow': 'radial-gradient(140% 140% at 50% 0%, rgba(0,229,255,0.08), transparent 50%)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0.14, 0.3, 1)',
        entrance: 'cubic-bezier(0.18, 0.6, 0.32, 1.0)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '220ms',
        slow: '340ms',
      },
      zIndex: {
        header: '50',
        overlay: '60',
        modal: '70',
        toast: '80',
      },
    }
  },
  plugins: []
}

export default config
