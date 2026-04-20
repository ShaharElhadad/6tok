import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0F0F10',
          900: '#171719',
          800: '#1F1F22',
          700: '#2B2B2E',
          600: '#3A3A3E',
          500: '#4C4C52',
          400: '#6B6B72',
          300: '#9C9CA3',
          200: '#C4C4CA',
          100: '#E5E5E8',
        },
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
        display: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,93,43,0.35), 0 10px 40px -10px rgba(232,93,43,0.4)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'radial-fade':
          'radial-gradient(80% 50% at 50% 0%, rgba(232,93,43,0.14) 0%, rgba(232,93,43,0) 60%)',
      },
    },
  },
  plugins: [],
};

export default config;
