/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        irctc: {
          blue: '#213d77',
          'blue-dark': '#172b54',
          'blue-deep': '#0f1d38',
          'blue-light': '#eef2f8',
          'blue-muted': '#3b5998',
          orange: '#fb792b',
          'orange-dark': '#e65100',
          'orange-light': '#fff7ed',
          amber: '#d97706',
          'amber-light': '#fffbeb',
          green: '#047857',
          'green-light': '#ecfdf5',
          red: '#dc2626',
          'red-light': '#fef2f2',
          bg: '#f4f6fa',
          card: '#ffffff',
          border: '#d8e2ed',
          text: '#1e293b',
          'text-muted': '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'irctc': '0 2px 8px -1px rgba(33, 61, 119, 0.08), 0 1px 3px -1px rgba(0, 0, 0, 0.04)',
        'irctc-lg': '0 8px 24px -4px rgba(33, 61, 119, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
