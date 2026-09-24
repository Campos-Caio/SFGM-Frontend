import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import {
  Alert,
  Button,
  FormField,
  Input,
  LoadingState,
  SlowServerNotice,
} from '../../components/ui';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { LoginRedirectState } from '../../auth/RequireAuth';

/** Rota para onde ir após o login: a pretendida (vinda do RequireAuth) ou a inicial. */
function destinoAposLogin(state: unknown): string {
  const from = (state as LoginRedirectState | null)?.from;
  if (!from?.pathname || from.pathname === '/login') return '/';
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

export default function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ login: '', senha: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authenticated') {
    return <Navigate to={destinoAposLogin(location.state)} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form.login, form.senha);
      // Sucesso: o status vira `authenticated` e o <Navigate> acima redireciona.
    } catch (err) {
      // 401 (credenciais inválidas) e 429 (muitas tentativas) trazem a
      // mensagem pronta do backend em `detail`.
      setError(extractErrorMessage(err));
      setForm((atual) => ({ ...atual, senha: '' }));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-slate-900 m-0">Nantes</p>
          <p className="text-sm text-slate-500 m-0">Sistema de Tesouraria</p>
        </div>
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-base font-semibold text-slate-900">Entrar</h1>
          {status === 'checking' ? (
            <>
              <LoadingState message="Verificando sessão..." />
              <SlowServerNotice pending />
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <Alert variant="error">{error}</Alert>}
              <FormField label="Login" htmlFor="login" required>
                <Input
                  id="login"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  maxLength={50}
                  required
                />
              </FormField>
              <FormField label="Senha" htmlFor="senha" required>
                <Input
                  id="senha"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  required
                />
              </FormField>
              <Button type="submit" icon={LogIn} className="w-full" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
              <SlowServerNotice pending={submitting} className="mt-3" />
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
