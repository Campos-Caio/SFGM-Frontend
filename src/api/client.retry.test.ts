import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import {
  apiClient,
  extractErrorMessage,
  HEALTH_PATH,
  LOGIN_PATH,
  REQUEST_TIMEOUT_MS,
  SERVER_UNAVAILABLE_MESSAGE,
} from './client';
import { resetWarmUpForTests, warmUpBackend } from './health';
import { clearCsrfToken } from '../auth/csrf';
import { nextSessionEpoch, setUnauthorizedHandler } from '../auth/unauthorized';

/** Resposta falsa: status HTTP, ou erro sem resposta (código axios) após uma demora opcional. */
type Fake = { status: number; data?: unknown } | { code: string; afterMs?: number };

/** Adapter falso: fila de respostas por "MÉTODO url" (a última se repete). */
function installFakeApi(routes: Record<string, Fake[]>) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const key = `${config.method?.toUpperCase()} ${config.url}`;
    const queue = routes[key];
    if (!queue) throw new Error(`rota não prevista no teste: ${key}`);
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    if ('code' in next) {
      if (next.afterMs) await new Promise((r) => setTimeout(r, next.afterMs));
      throw new AxiosError('falha', next.code, config);
    }
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

describe('apiClient: repetição automática em falhas transitórias (backend acordando)', () => {
  let handler: Mock<() => void>;
  let unregister: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    clearCsrfToken();
    handler = vi.fn<() => void>();
    unregister = setUnauthorizedHandler(handler);
  });

  afterEach(() => {
    unregister();
    apiClient.defaults.adapter = originalAdapter;
    vi.useRealTimers();
  });

  it('define timeout de 70 s para não esperar indefinidamente', () => {
    expect(REQUEST_TIMEOUT_MS).toBe(70_000);
    expect(apiClient.defaults.timeout).toBe(REQUEST_TIMEOUT_MS);
  });

  it('GET com 502, 503 e 504 é repetido com espera crescente (5 s, 15 s, 30 s) até ter sucesso', async () => {
    const { count } = installFakeApi({
      'GET /lojas': [
        { status: 502 },
        { status: 503 },
        { status: 504 },
        { status: 200, data: ['ok'] },
      ],
    });

    const promise = apiClient.get('/lojas');
    await vi.advanceTimersByTimeAsync(0);
    expect(count('GET /lojas')).toBe(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(count('GET /lojas')).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(count('GET /lojas')).toBe(2);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(count('GET /lojas')).toBe(3);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(count('GET /lojas')).toBe(4);

    await expect(promise).resolves.toMatchObject({ data: ['ok'] });
  });

  it('GET com erro de rede ou timeout (sem resposta) também é repetido', async () => {
    const { count } = installFakeApi({
      'GET /auth/me': [
        { code: 'ERR_NETWORK' },
        { code: 'ECONNABORTED' },
        { status: 200, data: { id: 1 } },
      ],
    });

    const promise = apiClient.get('/auth/me');
    await vi.advanceTimersByTimeAsync(20_000);

    await expect(promise).resolves.toMatchObject({ data: { id: 1 } });
    expect(count('GET /auth/me')).toBe(3);
  });

  it('desiste após 4 tentativas e propaga o último erro', async () => {
    const { count } = installFakeApi({ 'GET /lojas': [{ status: 504 }] });

    const result = apiClient.get('/lojas').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(120_000);

    expect(((await result) as AxiosError).response?.status).toBe(504);
    expect(count('GET /lojas')).toBe(4);
  });

  it('não inicia nova tentativa depois de 90 s desde o primeiro envio (timeouts longos)', async () => {
    // Cada tentativa leva 40 s até falhar: 0-40 s, espera 5 s, 45-85 s; a
    // próxima (85 + 15 s) passaria de 90 s, então desiste.
    const { count } = installFakeApi({
      'GET /lojas': [{ code: 'ECONNABORTED', afterMs: 40_000 }],
    });

    const result = apiClient.get('/lojas').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(300_000);

    expect(((await result) as AxiosError).code).toBe('ECONNABORTED');
    expect(count('GET /lojas')).toBe(2);
  });

  it('nunca repete escritas: POST do login e demais POST/PUT/PATCH/DELETE com falha transitória', async () => {
    const { count } = installFakeApi({
      [`POST ${LOGIN_PATH}`]: [{ status: 504 }],
      'POST /membros': [{ code: 'ERR_NETWORK' }],
      'PUT /membros/1': [{ status: 502 }],
      'PATCH /membros/1/status': [{ status: 503 }],
      'DELETE /lancamentos/1': [{ status: 504 }],
    });

    const results = Promise.all(
      [
        apiClient.post(LOGIN_PATH, 'x'),
        apiClient.post('/membros', {}),
        apiClient.put('/membros/1', {}),
        apiClient.patch('/membros/1/status', {}),
        apiClient.delete('/lancamentos/1'),
      ].map((p) => p.catch((e: unknown) => e))
    );
    await vi.advanceTimersByTimeAsync(120_000);
    for (const error of await results) expect(error).toBeInstanceOf(AxiosError);

    expect(count(`POST ${LOGIN_PATH}`)).toBe(1);
    expect(count('POST /membros')).toBe(1);
    expect(count('PUT /membros/1')).toBe(1);
    expect(count('PATCH /membros/1/status')).toBe(1);
    expect(count('DELETE /lancamentos/1')).toBe(1);
  });

  it('não repete erros que não são transitórios (500, 404) nem cancelamentos', async () => {
    const { calls } = installFakeApi({
      'GET /a': [{ status: 500 }],
      'GET /b': [{ status: 404 }],
      'GET /c': [{ code: 'ERR_CANCELED' }],
    });

    const results = Promise.all(
      ['/a', '/b', '/c'].map((u) => apiClient.get(u).catch((e: unknown) => e))
    );
    await vi.advanceTimersByTimeAsync(120_000);
    await results;

    expect(calls.map((c) => c.url)).toEqual(['/a', '/b', '/c']);
  });

  it('401 após uma repetição continua levando ao login', async () => {
    const { count } = installFakeApi({ 'GET /lojas': [{ status: 502 }, { status: 401 }] });

    const result = apiClient.get('/lojas').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(((await result) as AxiosError).response?.status).toBe(401);
    expect(count('GET /lojas')).toBe(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('repetição mantém a sessão original: seu 401 não derruba sessão iniciada durante a espera', async () => {
    installFakeApi({ 'GET /lojas': [{ status: 502 }, { status: 401 }] });

    const result = apiClient.get('/lojas').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(0);
    nextSessionEpoch(); // logout + novo login enquanto a repetição aguardava
    await vi.advanceTimersByTimeAsync(5_000);

    expect(((await result) as AxiosError).response?.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('extractErrorMessage: servidor indisponível', () => {
  it.each([502, 503, 504])('HTTP %i sem detail vira mensagem amigável', (status) => {
    const error = { isAxiosError: true, response: { status, data: '<html>Bad Gateway</html>' } };
    expect(extractErrorMessage(error)).toBe(SERVER_UNAVAILABLE_MESSAGE);
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT'])('timeout (%s) vira mensagem amigável', (code) => {
    expect(extractErrorMessage({ isAxiosError: true, code, response: undefined })).toBe(
      SERVER_UNAVAILABLE_MESSAGE
    );
  });

  it('detail do backend tem precedência mesmo em 503', () => {
    const error = {
      isAxiosError: true,
      response: { status: 503, data: { detail: 'Em manutenção.' } },
    };
    expect(extractErrorMessage(error)).toBe('Em manutenção.');
  });
});

describe('warmUpBackend', () => {
  beforeEach(() => resetWarmUpForTests());
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('dispara GET /health uma única vez por carregamento da página', async () => {
    const { calls, count } = installFakeApi({ [`GET ${HEALTH_PATH}`]: [{ status: 200 }] });

    warmUpBackend();
    warmUpBackend();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 0));

    expect(count(`GET ${HEALTH_PATH}`)).toBe(1);
  });

  it('ignora falhas silenciosamente (sem exceção, rejeição não tratada nem ida ao login)', async () => {
    const handler = vi.fn();
    const unregister = setUnauthorizedHandler(handler);
    const { calls } = installFakeApi({ [`GET ${HEALTH_PATH}`]: [{ status: 500 }] });

    expect(() => warmUpBackend()).not.toThrow();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).not.toHaveBeenCalled();
    unregister();
  });
});
