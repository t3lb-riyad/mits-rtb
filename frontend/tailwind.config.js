/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#22549E',
        accent: '#FDF05',
        dark: '#22549E',
        light: '#FFF4EB',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
