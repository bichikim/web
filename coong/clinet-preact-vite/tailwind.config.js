/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  daisyui: {
    base: true,
    styled: true,
    themes: true,
    utils: true,
  },
  plugins: [require('daisyui')],
}
