/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      aspectRatio: {
        'kiosk': '4 / 3',
      },
      colors: {
        'museum': {
          'stone': '#f5f0e8',
          'warm': '#e8dfd3',
          'accent': '#8b7355',
          'dark': '#3d3428',
          'highlight': '#c4a574',
        },
        'equipment': {
          'pump': '#2d5a3d',
          'steam': '#c44536',
          'discharge': '#d4a84b',
          'water': '#4a7c9b',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Source Sans Pro', 'sans-serif'],
      },
      fontSize: {
        'kiosk-sm': '1.125rem',
        'kiosk-base': '1.375rem',
        'kiosk-lg': '1.75rem',
        'kiosk-xl': '2.25rem',
        'kiosk-2xl': '3rem',
      },
      spacing: {
        'touch': '2.75rem',
      }
    },
  },
  plugins: [],
}
