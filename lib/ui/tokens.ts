// Design tokens used across UI components. Keep in sync with globals.css and tailwind.config.ts.
export const colors = {
  brand: '#00E5FF',
  brandSoft: '#38E8FF',
  brandDark: '#0891B2',
  surface: '#030712',
  surfaceMuted: '#0B1224',
  surfaceRaised: '#0F172A',
  foreground: '#E5E7EB',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderStrong: '#0F172A',
  danger: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  info: '#38BDF8',
};

export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

export const radii = {
  sm: '0.625rem',
  md: '0.75rem',
  lg: '0.9rem',
  xl: '1.1rem',
  full: '9999px',
};

export const shadows = {
  focus: '0 0 0 4px rgba(0, 229, 255, 0.18)',
  card: '0 12px 32px rgba(0, 0, 0, 0.45)',
  popover: '0 18px 45px rgba(0, 0, 0, 0.5)',
};

export const motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 320,
  },
  easing: 'cubic-bezier(0.4, 0.14, 0.3, 1)',
};

export const tokens = {
  colors,
  spacing,
  radii,
  shadows,
  motion,
};

export type Tokens = typeof tokens;
