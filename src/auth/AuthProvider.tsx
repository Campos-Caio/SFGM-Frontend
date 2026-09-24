import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { authApi } from '../api/auth';
import { extractErrorMessage } from '../api/client';
import type { Usuario } from '../types/auth';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';
import { clearCsrfToken, setCsrfToken } from './csrf';
import { nextSessionEpoch, setUnauthorizedHandler } from './unauthorized';

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/**
 * Mantém o estado da sessão do usuário. A sessão é o cookie HttpOnly do
 * backend, invisível ao JS: ao montar, ela é restaurada (ou descartada) via
 * GET /auth/me, que também devolve o token anti-CSRF. Qualquer 401 posterior
 * (interceptado em api/client.ts) encerra a sessão, e as rotas protegidas
 * (RequireAuth) levam ao login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Incrementado por retry() para disparar nova validação da sessão.
  const [checkAttempt, setCheckAttempt] = useState(0);

  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        clearCsrfToken();
        setUsuario(null);
        setStatus('unauthenticated');
      }),
    []
  );

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then(({ csrf_token, ...result }) => {
        if (!active) return;
        setCsrfToken(csrf_token);
        setUsuario(result);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (!active) return;
        if (isUnauthorized(err)) {
          // Sem sessão: o interceptor já tratou; apenas garante o estado.
          setStatus('unauthenticated');
        } else {
          setError(extractErrorMessage(err));
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [checkAttempt]);

  const login = useCallback(async (loginValue: string, senha: string) => {
    const { csrf_token, usuario: logado } = await authApi.login(loginValue, senha);
    nextSessionEpoch();
    setCsrfToken(csrf_token);
    setUsuario(logado);
    setError(null);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Falha de rede/servidor: a sessão local é encerrada mesmo assim.
    }
    nextSessionEpoch();
    clearCsrfToken();
    setUsuario(null);
    setError(null);
    setStatus('unauthenticated');
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setStatus('checking');
    setCheckAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, usuario, error, login, logout, retry }),
    [status, usuario, error, login, logout, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
