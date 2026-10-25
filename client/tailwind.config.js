/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          50: '#f0f9fa',
          100: '#d9f0f2',
          200: '#b4e1e5',
          300: '#7fc9cf',
          400: '#43a9b3',
          500: '#1e8a95',
          600: '#166e79',
          700: '#155862',
          800: '#164850',
          900: '#163d44',
          950: '#0a272d',
        },
        navy: {
          800: '#111e38',
          900: '#0b1329',
          950: '#060a17',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
