/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          red: '#dc2626', // red-600
          darkred: '#b91c1c', // red-700
          light: '#fef2f2', // red-50
          white: '#ffffff',
          gray: '#f3f4f6', // gray-100
          dark: '#1f2937', // gray-800
        }
      }
    },
  },
  plugins: [],
}
