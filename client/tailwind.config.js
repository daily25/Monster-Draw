/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka One"', 'cursive'],
        body: ['"Nunito"', 'sans-serif'],
      },
      colors: {
        monster: {
          purple: '#7C3AED',
          pink: '#EC4899',
          green: '#10B981',
          orange: '#F59E0B',
          blue: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
};
