import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0a0a0d',
          900: '#121216',
          850: '#17171c',
          800: '#1d1d23',
          700: '#27272f',
          600: '#35353f',
        },
        accent: {
          400: '#7dd3c0',
          500: '#4fb8a1',
          600: '#3a9884',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
        slideUp: 'slideUp 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
