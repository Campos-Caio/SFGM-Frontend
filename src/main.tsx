import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { warmUpBackend } from './api/health'

// Acorda o backend (pode estar hibernando) antes mesmo da checagem de sessão.
warmUpBackend()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
