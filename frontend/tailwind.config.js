/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{App,index}.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0F172A', // Noche Industrial / Slate 900 (Page Background)
          surface: '#1E293B', // Pizarra Profunda / Slate 800 (Cards)
          primary: '#3B82F6', // Azul Acero / Steel Blue (Actions)
          'primary-hover': '#2563EB', // Darker Blue
          nav: '#020617', // Pizarra 950 (Navigation/Sidebar)
          text: '#F8FAFC', // Blanco Pizarra / Slate 50 (Primary Text)
          'text-secondary': '#94A3B8', // Slate 400 (Secondary Text)
          border: '#334155', // Slate 700 (Borders)

          // Legacy/Compatibility mapping
          dark: '#0F172A',
          darker: '#1E293B',
          white: '#F8FAFC',
          'surface-dark': '#1e293b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      screens: {
        'xs': '475px', // Mobile Small
        'tablet': '800px', // Tablet Start (10")
        'laptop': '1100px', // Tablet End / Desktop Start
      },
    },
  },
  plugins: [],
}
