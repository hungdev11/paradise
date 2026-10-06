/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zen: {
          dark: '#0c0a09',
          surface: '#1c1917',
          panel: '#292524',
          border: '#44403c',
          gold: '#eab308',
          goldLight: '#fde047',
          goldDark: '#ca8a04',
          amber: '#f59e0b',
          wood: '#78350f',
          woodLight: '#92400e',
          woodDark: '#451a03',
          red: '#b91c1c',
          lotus: '#f472b6',
          smoke: 'rgba(214, 211, 209, 0.4)'
        }
      },
      fontFamily: {
        serif: ['"Noto Serif"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 16px rgba(234, 179, 8, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
