/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class', // Active le dark mode basé sur la classe .dark
  theme: {
    extend: {
      colors: {
        // Palette MyBrand.tools (light)
        text: '#1D1111',
        bg: '#ffffff',
        'bg-secondary': '#F7F7F7',
        primary: '#3FA7D6',
        secondary: '#094074',
        tertiary: '#EE6352',
      },
    },
  },
  plugins: [],
};

