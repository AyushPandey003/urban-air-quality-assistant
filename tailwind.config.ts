import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // AQI palette (mirrors aqi.ts band colors)
        aqi: {
          good: '#10b981',
          moderate: '#f59e0b',
          sensitive: '#f97316',
          unhealthy: '#ef4444',
          veryunhealthy: '#a855f7',
          hazardous: '#881337',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
