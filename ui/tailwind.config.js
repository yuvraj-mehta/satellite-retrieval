/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A0E1A',
        'bg-surface': '#111827',
        'bg-surface-2': '#1A2035',
        'bg-surface-3': '#1F2847',
        'border': 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(255, 255, 255, 0.16)',
        'accent-violet': '#7C3AED',
        'accent-violet-light': '#A855F7',
        'accent-violet-dim': 'rgba(124, 58, 237, 0.15)',
        'accent-cyan': '#00D4AA',
        'accent-cyan-dim': 'rgba(0, 212, 170, 0.12)',
        'accent-amber': '#F59E0B',
        'accent-red': '#EF4444',
        'accent-green': '#10B981',
        'accent-blue': '#3B82F6',
        'text-primary': '#F9FAFB',
        'text-secondary': '#9CA3AF',
        'text-muted': '#6B7280',
      },
      spacing: {
        'navbar-height': '64px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow-violet': '0 0 20px rgba(124, 58, 237, 0.25)',
        'glow-cyan': '0 0 20px rgba(0, 212, 170, 0.2)',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
