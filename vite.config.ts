/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: a API é servida na mesma origem do frontend (VITE_API_URL=/api),
    // para o cookie de sessão HttpOnly (SameSite=Lax) e o CSRF funcionarem
    // sem CORS. As rotas do backend não têm prefixo, então `/api` é removido.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
