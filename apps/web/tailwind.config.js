/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#edf0ed',
        surface: '#f7f8f7',
        ink: '#0a0a0a',
        muted: '#6b6f6b',
        line: '#d5d8d5',
        olive: '#0a0a0a',
        bronze: '#2a2a2a',
        dark: '#0a0a0a',
        red: '#c43c2c',
        amber: '#9a6b2f',
        clay: '#c43c2c',
        'olive-deep': '#0a0a0a',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        wrap: '1280px',
        page: '1280px',
        profile: '960px',
      },
      borderRadius: {
        card: '0px',
        btn: '0px',
      },
      screens: {
        bp: '720px',
        lg: '1024px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        reveal: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
