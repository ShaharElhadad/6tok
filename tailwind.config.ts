import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0A0B',
          900: '#111113',
          880: '#151518',
          850: '#191A1D',
          800: '#1E1F22',
          700: '#282A2D',
          600: '#35373B',
          500: '#4A4C51',
          400: '#686A70',
          300: '#9A9C9F',
          200: '#C4C5C7',
          100: '#E6E7E8',
          50:  '#F2F2F3',
        },
        paper: '#F4EDE1',
        brand: {
          DEFAULT: '#E85D2B',
          50: '#FEF3ED',
          100: '#FCE2D2',
          200: '#F8BF9F',
          300: '#F39A6B',
          400: '#EE7A46',
          500: '#E85D2B',
          600: '#C84815',
          700: '#9E3710',
          800: '#75290C',
          900: '#4B1A07',
        },
      },
      fontFamily: {
        sans: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
        display: ['var(--font-frank)', 'var(--font-rubik)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        mono: '0.14em',
      },
      fontSize: {
        'display-xl': ['clamp(48px, 8vw, 96px)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(36px, 5vw, 64px)', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
      },
    },
  },
  plugins: [],
};

export default config;
