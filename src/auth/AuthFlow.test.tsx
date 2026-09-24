import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { AuthProvider } from './AuthProvider';
import { RequireAuth } from './RequireAuth';
import { clearCsrfToken, getCsrfToken } from './csrf';
import LoginPage from '../pages/Login/LoginPage';
import { AppLayout } from '../components/layout/AppLayout';
import { apiClient, SERVER_UNAVAILABLE_MESSAGE } from '../api/client';
import { SLOW_SERVER_MESSAGE } from '../components/ui';
import { authApi } from '../api/auth';
import { lojaApi } from '../api/loja';

vi.mock('../api/auth', () => ({ authApi: { login: vi.fn(), me: vi.fn(), logout: vi.fn() } }));
vi.mock('../api/loja');

const usuario = { id: 1, login: 'tesoureiro', nome: 'Fulano de Tal' };
const me = { ...usuario, csrf_token: 'csrf-me' };

function apiError(status: number, detail?: string) {
  return {
    isAxiosError: true,
    response: { status, data: detail ? { detail } : {} },
  };
}

/** Tela protegida que faz uma requisição real pelo apiClient (adapter falso com 401). */
function TelaQueRecebe401() {
  useEffect(() => {
    const adapter: AxiosAdapter = async (config) => {
      const response = {
        status: 401,
        statusText: '',
        data: { detail: 'Nao autenticado.' },
        headers: {},
        config,
      };
      throw new AxiosError('erro', 'ERR_BAD_REQUEST', config, null, response);
    };
    apiClient.get('/lojas', { adapter }).catch(() => {});
  }, []);
  return <div>Tela que recebe 401</div>;
}

function renderApp(initialPath: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<div>Tela inicial</div>} />
              <Route path="/membros" element={<div>Tela de membros</div>} />
              <Route path="/expira" element={<TelaQueRecebe401 />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

async function preencherEEntrar(login = 'tesoureiro', senha = 'segredo') {
  const user = userEvent.setup();
  // Ao abrir /login a sessão é verificada antes (GET /auth/me) de exibir o formulário.
  await user.type(await screen.findByLabelText(/Login/), login);
  await user.type(screen.getByLabelText(/Senha/), senha);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

const loginResponse = { csrf_token: 'csrf-login', usuario, expires_in: 28800 };
const naoAutenticado = () => apiError(401, 'Nao autenticado.');

describe('Fluxo de autenticação', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    clearCsrfToken();
    window.sessionStorage.clear();
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    // Padrão: não há cookie de sessão (o navegador não envia nada).
    vi.mocked(authApi.me).mockRejectedValue(naoAutenticado());
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
  });

  it('sem sessão, rota protegida leva ao login; após login volta à rota pretendida sem guardar nada no storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.mocked(authApi.login).mockResolvedValue(loginResponse);

    renderApp('/membros');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByText('Tela de membros')).not.toBeInTheDocument();

    await preencherEEntrar('Tesoureiro', 'segredo');

    expect(await screen.findByText('Tela de membros')).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith('Tesoureiro', 'segredo');
    expect(screen.getByText('Fulano de Tal')).toBeInTheDocument();
    // csrf_token só em memória; nada gravado em sessionStorage/localStorage.
    expect(getCsrfToken()).toBe('csrf-login');
    expect(setItem).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('acesso direto a /login, após login, vai para a tela inicial', async () => {
    vi.mocked(authApi.login).mockResolvedValue(loginResponse);

    renderApp('/login');
    await preencherEEntrar();

    expect(await screen.findByText('Tela inicial')).toBeInTheDocument();
  });

  it('401 no login mostra a mensagem do backend no formulário e não redireciona', async () => {
    vi.mocked(authApi.login).mockRejectedValue(apiError(401, 'Login ou senha invalidos.'));

    renderApp('/login');
    await preencherEEntrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Login ou senha invalidos.');
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(getCsrfToken()).toBeNull();
  });

  it('429 no login mostra a mensagem de muitas tentativas', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      apiError(429, 'Muitas tentativas de login. Aguarde e tente novamente.')
    );

    renderApp('/login');
    await preencherEEntrar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas de login. Aguarde e tente novamente.'
    );
  });

  it('com cookie de sessão válido, restaura via /auth/me (nome no header e csrf em memória)', async () => {
    vi.mocked(authApi.me).mockResolvedValue(me);

    renderApp('/membros');

    expect(screen.getByText('Verificando sessão...')).toBeInTheDocument();
    expect(await screen.findByText('Tela de membros')).toBeInTheDocument();
    expect(screen.getByText('Fulano de Tal')).toBeInTheDocument();
    expect(getCsrfToken()).toBe('csrf-me');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('sem sessão (/auth/me 401) leva ao login', async () => {
    renderApp('/membros');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByText('Tela de membros')).not.toBeInTheDocument();
  });

  it.each([
    ['504 do gateway', apiError(504)],
    ['timeout', { isAxiosError: true, code: 'ECONNABORTED', response: undefined }],
  ])('%s no login mostra "servidor indisponível" e permite tentar de novo', async (_, erro) => {
    vi.mocked(authApi.login).mockRejectedValue(erro);

    renderApp('/login');
    await preencherEEntrar();

    expect(await screen.findByRole('alert')).toHaveTextContent(SERVER_UNAVAILABLE_MESSAGE);
    expect(authApi.login).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('checagem de sessão lenta avisa que o servidor está iniciando e o aviso some ao concluir', async () => {
    vi.useFakeTimers();
    try {
      let responder!: (valor: typeof me) => void;
      vi.mocked(authApi.me).mockReturnValue(new Promise((resolve) => (responder = resolve)));

      renderApp('/');
      expect(screen.getByText('Verificando sessão...')).toBeInTheDocument();
      expect(screen.queryByText(SLOW_SERVER_MESSAGE)).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(4_000));
      expect(screen.getByText(SLOW_SERVER_MESSAGE)).toBeInTheDocument();

      await act(async () => responder(me));
      expect(screen.getByText('Tela inicial')).toBeInTheDocument();
      expect(screen.queryByText(SLOW_SERVER_MESSAGE)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('falha de rede ao validar a sessão mostra erro com opção de tentar novamente', async () => {
    vi.mocked(authApi.me)
      .mockRejectedValueOnce({ isAxiosError: true, response: undefined })
      .mockResolvedValueOnce(me);

    renderApp('/membros');

    expect(await screen.findByText(/conectar ao servidor/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Tela de membros')).toBeInTheDocument();
  });

  it('401 em requisição autenticada durante o uso encerra a sessão e redireciona ao login', async () => {
    vi.mocked(authApi.me).mockResolvedValue(me);

    renderApp('/expira');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByText('Tela que recebe 401')).not.toBeInTheDocument();
    expect(getCsrfToken()).toBeNull();
  });

  it('logout chama POST /auth/logout, descarta o csrf e volta à tela de login', async () => {
    vi.mocked(authApi.me).mockResolvedValue(me);

    renderApp('/membros');
    expect(await screen.findByText('Tela de membros')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(getCsrfToken()).toBeNull();
    await waitFor(() => expect(screen.queryByText('Fulano de Tal')).not.toBeInTheDocument());
  });

  it('logout encerra a sessão local mesmo se POST /auth/logout falhar', async () => {
    vi.mocked(authApi.me).mockResolvedValue(me);
    vi.mocked(authApi.logout).mockRejectedValue({ isAxiosError: true, response: undefined });

    renderApp('/membros');
    expect(await screen.findByText('Tela de membros')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(getCsrfToken()).toBeNull();
  });
});
