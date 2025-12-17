/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@horizon/ui/tailwind.config.js')],
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};

