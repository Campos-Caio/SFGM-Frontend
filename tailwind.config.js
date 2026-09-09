/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Tokens visuais do design system (ver task de refatoração visual, seções 6-8):
      // primary = blue-600, background = slate-50, surface = white, border = slate-200,
      // text = slate-900/slate-500, success = emerald, warning = amber, danger = red.
      // A paleta padrão do Tailwind (slate/blue/emerald/amber/red) já cobre esses
      // tokens, então usamos as classes utilitárias diretamente nos componentes.
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        app: '1440px',
      },
    },
  },
  plugins: [],
}
