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
        brand: '#4f46e5', // Sapphire Indigo (Primária)
        emerald: {
          500: '#10b981', // Sucesso
        },
        slate: {
          950: '#020617', // Midnight Deep
        }
      }
    },
  },
  plugins: [],
};
