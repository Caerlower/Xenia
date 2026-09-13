/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#edf0ed',
          elev: '#f7f8f7',
        },
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#2a2a2a',
        },
        muted: '#6b6f6b',
        line: '#d5d8d5',
        red: '#c43c2c',
        amber: '#9a6b2f',
        // Back-compat aliases so existing app routes keep working
        olive: {
          DEFAULT: '#0a0a0a',
          deep: '#0a0a0a',
          soft: '#2a2a2a',
          mist: '#e4e6e4',
        },
        stone: {
          DEFAULT: '#edf0ed',
          elev: '#f7f8f7',
          line: '#d5d8d5',
          mute: '#6b6f6b',
          ink: '#0a0a0a',
        },
        copper: {
          DEFAULT: '#2a2a2a',
          soft: '#6b6f6b',
          deep: '#0a0a0a',
        },
        good: '#2f5d3a',
        bad: '#c43c2c',
        warn: '#9a6b2f',
      },
      fontFamily: {
        display: ['var(--font-pixel)', 'monospace'],
        pixel: ['var(--font-pixel)', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        wrap: '1120px',
      },
      boxShadow: {
        soft: '0 24px 64px rgba(10, 10, 10, 0.28)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        rise: 'rise 0.55s cubic-bezier(0.23, 1, 0.32, 1) both',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};
