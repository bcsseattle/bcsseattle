// The website's tokens and text styles, scanning this app and the shared components.
const shared = require('../../tailwind.config.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...shared,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../components/ui/**/*.{ts,tsx}',
    '../../components/portal/**/*.{ts,tsx}',
    '../../components/elections/**/*.{ts,tsx}',
    '../../components/fundraisers/**/*.{ts,tsx}'
  ]
};
