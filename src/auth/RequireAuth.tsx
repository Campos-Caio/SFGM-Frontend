import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button, ErrorState, LoadingState, SlowServerNotice } from '../components/ui';
import { StoreProvider } from '../store/StoreProvider';
import { useAuth } from './AuthContext';

/** Estado de navegação usado para voltar à rota pretendida após o login. */
export interface LoginRedirectState {
  from?: { pathname: string; search?: string; hash?: string };
}

/**
 * Guarda de rotas: só renderiza as rotas filhas com sessão válida. Sem
 * sessão, redireciona para /login lembrando a rota pretendida. A loja atual
 * (StoreProvider) só é carregada com sessão válida e é descartada ao sair.
 */
export function RequireAuth() {
  const { status, error, retry, logout } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingState message="Verificando sessão..." />
        <SlowServerNotice pending className="px-4" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorState
            message={error ?? 'Não foi possível validar a sessão.'}
            onRetry={retry}
          />
          <div className="mt-3 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Entrar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    const state: LoginRedirectState = { from: location };
    return <Navigate to="/login" replace state={state} />;
  }

  return (
    <StoreProvider>
      <Outlet />
    </StoreProvider>
  );
}
