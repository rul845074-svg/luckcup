/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E8590C',
        'primary-dark': '#C74A08',
        accent: '#F59F00',
        bg: '#FBF7F4',
        profit: '#2B9348',
        loss: '#C1121F',
      },
    },
  },
  plugins: [],
};
