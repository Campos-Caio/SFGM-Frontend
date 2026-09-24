import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { apiClient, LOGIN_PATH } from './client';
import { authApi } from './auth';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from '../auth/csrf';
import { nextSessionEpoch, setUnauthorizedHandler } from '../auth/unauthorized';

type FakeResponse = { status: number; data?: unknown };

const CSRF_403: FakeResponse = { status: 403, data: { detail: 'Falha na verificacao CSRF.' } };

/**
 * Adapter falso instalado no apiClient: responde por "MÉTODO url" com uma
 * fila de respostas (a última se repete) e registra toda requisição enviada.
 */
function installFakeApi(routes: Record<string, FakeResponse[]>) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const key = `${config.method?.toUpperCase()} ${config.url}`;
    const queue = routes[key];
    if (!queue) throw new Error(`rota não prevista no teste: ${key}`);
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    const response = {
      status: next.status,
      statusText: '',
      data: next.data ?? {},
      headers: {},
      config,
    };
    if (next.status >= 400) {
      throw new AxiosError('erro', 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  };
  apiClient.defaults.adapter = adapter;
  const count = (key: string) =>
    calls.filter((c) => `${c.method?.toUpperCase()} ${c.url}` === key).length;
  return { calls, count };
}

const originalAdapter = apiClient.defaults.adapter;

describe('apiClient: sessão por cookie + CSRF', () => {
  let handler: Mock<() => void>;
  let unregister: () => void;

  beforeEach(() => {
    clearCsrfToken();
    handler = vi.fn<() => void>();
    unregister = setUnauthorizedHandler(handler);
  });

  afterEach(() => {
    unregister();
    apiClient.defaults.adapter = originalAdapter;
  });

  it('envia o cookie (withCredentials) e nunca o header Authorization', async () => {
    setCsrfToken('csrf-1');
    const { calls } = installFakeApi({ 'GET /lojas': [{ status: 200 }], 'POST /lojas': [{ status: 201 }] });

    await apiClient.get('/lojas');
    await apiClient.post('/lojas', { nome: 'x' });

    for (const call of calls) {
      expect(call.withCredentials).toBe(true);
      expect(call.headers.Authorization).toBeUndefined();
    }
  });

  it('envia X-CSRF-Token em POST/PUT/PATCH/DELETE e não em GET', async () => {
    setCsrfToken('csrf-1');
    const { calls } = installFakeApi({
      'GET /membros/1': [{ status: 200 }],
      'POST /membros': [{ status: 201 }],
      'PUT /membros/1': [{ status: 200 }],
      'PATCH /membros/1/status': [{ status: 200 }],
      'DELETE /lancamentos/1': [{ status: 204 }],
    });

    await apiClient.get('/membros/1');
    await apiClient.post('/membros', {});
    await apiClient.put('/membros/1', {});
    await apiClient.patch('/membros/1/status', {});
    await apiClient.delete('/lancamentos/1');

    const [get, ...writes] = calls;
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
    for (const call of writes) expect(call.headers['X-CSRF-Token']).toBe('csrf-1');
  });

  it('403 de CSRF: renova via /auth/me e repete a requisição original uma vez com o token novo', async () => {
    setCsrfToken('csrf-velho');
    const { calls, count } = installFakeApi({
      'POST /membros': [CSRF_403, { status: 201, data: { id: 9 } }],
      'GET /auth/me': [{ status: 200, data: { id: 1, login: 't', nome: 'T', csrf_token: 'csrf-novo' } }],
    });

    const { data } = await apiClient.post('/membros', { nome: 'Fulano' });

    expect(data).toEqual({ id: 9 });
    expect(count('GET /auth/me')).toBe(1);
    expect(count('POST /membros')).toBe(2);
    const retry = calls[calls.length - 1];
    expect(retry.headers['X-CSRF-Token']).toBe('csrf-novo');
    expect(retry.data).toBe(JSON.stringify({ nome: 'Fulano' }));
    expect(getCsrfToken()).toBe('csrf-novo');
    expect(handler).not.toHaveBeenCalled();
  });

  it('403 de CSRF persistente não entra em loop: uma renovação, uma repetição e o erro propaga', async () => {
    setCsrfToken('csrf-velho');
    const { count } = installFakeApi({
      'POST /membros': [CSRF_403],
      'GET /auth/me': [{ status: 200, data: { id: 1, login: 't', nome: 'T', csrf_token: 'csrf-novo' } }],
    });

    const error = await apiClient.post('/membros', {}).catch((e: unknown) => e);

    expect((error as AxiosError).response?.status).toBe(403);
    expect(count('POST /membros')).toBe(2);
    expect(count('GET /auth/me')).toBe(1);
  });

  it('403 de CSRF com /auth/me 401: não repete e leva ao login', async () => {
    setCsrfToken('csrf-velho');
    const { count } = installFakeApi({
      'POST /membros': [CSRF_403],
      'GET /auth/me': [{ status: 401, data: { detail: 'Nao autenticado.' } }],
    });

    const error = await apiClient.post('/membros', {}).catch((e: unknown) => e);

    expect((error as AxiosError).response?.status).toBe(403);
    expect(count('POST /membros')).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('403 que não é de CSRF não dispara renovação', async () => {
    const { count } = installFakeApi({
      'DELETE /lancamentos/1': [{ status: 403, data: { detail: 'Outro motivo.' } }],
    });

    await expect(apiClient.delete('/lancamentos/1')).rejects.toBeInstanceOf(AxiosError);
    expect(count('DELETE /lancamentos/1')).toBe(1);
  });

  it('401 em requisição autenticada notifica o handler (ir para o login) e propaga o erro', async () => {
    installFakeApi({ 'GET /lojas': [{ status: 401, data: { detail: 'Nao autenticado.' } }] });

    await expect(apiClient.get('/lojas')).rejects.toBeInstanceOf(AxiosError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('401 em download de PDF (responseType blob) também leva ao login', async () => {
    installFakeApi({
      'GET /lojas/1/membros/2/documento/pdf': [
        { status: 401, data: new Blob(['{"detail":"Nao autenticado."}']) },
      ],
    });

    await expect(
      apiClient.get('/lojas/1/membros/2/documento/pdf', { responseType: 'blob' })
    ).rejects.toBeInstanceOf(AxiosError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('401 e 403 do POST /auth/login ficam com o formulário (sem redirect nem renovação)', async () => {
    const { count } = installFakeApi({
      [`POST ${LOGIN_PATH}`]: [
        { status: 401, data: { detail: 'Login ou senha invalidos.' } },
        CSRF_403,
      ],
    });

    await expect(apiClient.post(LOGIN_PATH, 'x')).rejects.toBeInstanceOf(AxiosError);
    await expect(apiClient.post(LOGIN_PATH, 'x')).rejects.toBeInstanceOf(AxiosError);
    expect(handler).not.toHaveBeenCalled();
    expect(count(`POST ${LOGIN_PATH}`)).toBe(2);
  });

  it('401 atrasado de requisição da sessão anterior não derruba a sessão nova', async () => {
    const adapter: AxiosAdapter = async (config) => {
      // Enquanto a requisição estava em curso, houve logout + novo login.
      nextSessionEpoch();
      const response = { status: 401, statusText: '', data: {}, headers: {}, config };
      throw new AxiosError('erro', 'ERR_BAD_REQUEST', config, null, response);
    };
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/lojas')).rejects.toBeInstanceOf(AxiosError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('authApi', () => {
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('login envia username/password como application/x-www-form-urlencoded', async () => {
    const loginResponse = {
      access_token: 'jwt-ignorado',
      token_type: 'bearer',
      expires_in: 28800,
      csrf_token: 'csrf-1',
      usuario: { id: 1, login: 'tesoureiro', nome: 'Fulano' },
    };
    const { calls } = installFakeApi({ 'POST /auth/login': [{ status: 200, data: loginResponse }] });

    await expect(authApi.login('Tesoureiro', 's3nh@ &x')).resolves.toEqual(loginResponse);

    const body = new URLSearchParams(calls[0].data as string);
    expect(body.get('username')).toBe('Tesoureiro');
    expect(body.get('password')).toBe('s3nh@ &x');
    expect(calls[0].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('logout faz POST /auth/logout com X-CSRF-Token', async () => {
    setCsrfToken('csrf-1');
    const { calls } = installFakeApi({ 'POST /auth/logout': [{ status: 204 }] });

    await authApi.logout();

    expect(calls).toHaveLength(1);
    expect(calls[0].headers['X-CSRF-Token']).toBe('csrf-1');
    clearCsrfToken();
  });
});
