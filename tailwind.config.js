/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neonCyan: 'hsl(180, 100%, 50%)',
        neonEmerald: 'hsl(150, 100%, 50%)',
        neonCrimson: 'hsl(340, 100%, 60%)',
        bgDark: '#0a0c12',
        bgPanel: 'rgba(20, 25, 35, 0.6)',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
