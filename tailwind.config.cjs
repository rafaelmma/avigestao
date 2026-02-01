module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './constants.tsx',
    './types.ts'
  ],
  theme: {
    extend: {
      colors: {
        brand: '#10b981', // emerald-500
      }
    },
  },
  plugins: [],
};
