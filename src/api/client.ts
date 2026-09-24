import axios, { type AxiosError } from 'axios';
import { getCsrfToken, setCsrfToken } from '../auth/csrf';
import { getSessionEpoch, handleUnauthorized } from '../auth/unauthorized';

/**
 * Cliente HTTP centralizado. Toda chamada à API deve passar por aqui (via os
 * módulos api/loja.ts, api/membros.ts, etc.) — nenhum componente deve fazer
 * fetch/axios direto para a API.
 *
 * baseURL vem de VITE_API_URL (nunca hardcode a URL da API em outro lugar).
 */
const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  // Falha cedo e de forma explícita em vez de silenciosamente bater em
  // localhost ou em uma URL relativa errada.
  // eslint-disable-next-line no-console
  console.error(
    'VITE_API_URL não definida. Configure um arquivo .env (ver .env.example).'
  );
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // A sessão é um cookie HttpOnly do backend. Em dev a API é servida na
  // mesma origem pelo proxy do Vite (VITE_API_URL=/api) e o cookie iria de
  // qualquer forma; `withCredentials` mantém o envio do cookie caso
  // VITE_API_URL aponte direto para outra origem (o backend libera CORS com
  // credenciais apenas para as origens configuradas).
  withCredentials: true,
});

/**
 * Caminho do login (público). Um 401/403 nele é erro de credencial/origem e
 * deve ser exibido no formulário — não é sessão expirada.
 */
export const LOGIN_PATH = '/auth/login';
/** Sessão atual (usuário + token anti-CSRF). */
export const ME_PATH = '/auth/me';

/** Header e mensagem do backend para falha na verificação anti-CSRF (403). */
const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_FAILURE_DETAIL = 'Falha na verificacao CSRF.';
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Sessão do cliente vigente quando a requisição saiu (ver auth/unauthorized.ts). */
    sessionEpoch?: number;
    /** Já foi repetida após renovar o token anti-CSRF (evita loop). */
    csrfRetried?: boolean;
  }
}

function isUnsafeMethod(method: string | undefined): boolean {
  return UNSAFE_METHODS.has((method ?? 'get').toLowerCase());
}

// Ponto único de injeção da autenticação: a sessão vai no cookie (enviado
// pelo navegador) e toda escrita leva o token anti-CSRF. Nunca enviar
// `Authorization`: um Bearer tem precedência no backend e ignoraria o cookie.
apiClient.interceptors.request.use((config) => {
  config.sessionEpoch = getSessionEpoch();
  const csrf = getCsrfToken();
  if (csrf && isUnsafeMethod(config.method)) {
    config.headers.set(CSRF_HEADER, csrf);
  }
  return config;
});

let csrfRefresh: Promise<boolean> | null = null;

/**
 * Obtém um token anti-CSRF novo via GET /auth/me (compartilhado entre
 * requisições que falharem ao mesmo tempo). `false` se não houver sessão
 * (o 401 do /auth/me já leva ao login pelo interceptor) ou em outra falha.
 */
function refreshCsrfToken(): Promise<boolean> {
  csrfRefresh ??= apiClient
    .get<{ csrf_token: string }>(ME_PATH)
    .then(({ data }) => {
      setCsrfToken(data.csrf_token);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      csrfRefresh = null;
    });
  return csrfRefresh;
}

function isCsrfFailure(error: AxiosError<FastApiErrorBody>): boolean {
  return (
    error.response?.status === 403 && error.response.data?.detail === CSRF_FAILURE_DETAIL
  );
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.config || error.config.url === LOGIN_PATH) {
    return Promise.reject(error);
  }
  const config = error.config;
  const status = error.response?.status;

  // 401 em qualquer requisição autenticada (sessão ausente, expirada ou
  // revogada) leva à tela de login — inclusive em respostas blob (PDF), pois
  // só o status HTTP é inspecionado. Ignora o 401 atrasado de uma requisição
  // feita por uma sessão anterior do cliente.
  if (status === 401) {
    if (config.sessionEpoch === getSessionEpoch()) handleUnauthorized();
    return Promise.reject(error);
  }

  // 403 de CSRF numa escrita: o token em memória está ausente/desatualizado.
  // Renova via /auth/me e repete a requisição original UMA única vez.
  if (
    isCsrfFailure(error as AxiosError<FastApiErrorBody>) &&
    isUnsafeMethod(config.method) &&
    !config.csrfRetried
  ) {
    if (await refreshCsrfToken()) {
      return apiClient.request({ ...config, csrfRetried: true });
    }
  }

  return Promise.reject(error);
});

/**
 * Formato de erro padrão da API (FastAPI):
 * - erro de negócio: { detail: string }
 * - erro de validação Pydantic (422): { detail: [{ loc, msg, ... }, ...] }
 */
interface FastApiErrorDetailItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

interface FastApiErrorBody {
  detail?: string | FastApiErrorDetailItem[];
}

/**
 * Extrai uma mensagem de erro amigável para exibição ao usuário a partir de
 * um erro do axios, tratando os dois formatos de erro da API.
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<FastApiErrorBody>;

    if (!axiosError.response) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }

    const detail = axiosError.response.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => {
          const campo = item.loc?.[item.loc.length - 1];
          return campo ? `${campo}: ${item.msg}` : item.msg;
        })
        .filter(Boolean)
        .join('; ');
    }

    return `Erro ${axiosError.response.status} ao comunicar com o servidor.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado.';
}

/**
 * Extrai os erros de validação Pydantic (422) do corpo da requisição,
 * indexados pelo nome do campo (último item de `loc`, quando `loc[0]` é
 * `body`), para exibição junto ao campo correspondente do formulário.
 * Retorna `{}` para qualquer outro erro (negócio, rede, etc.).
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return {};
  const detail = (error as AxiosError<FastApiErrorBody>).response?.data?.detail;
  if (!Array.isArray(detail)) return {};

  const erros: Record<string, string> = {};
  for (const item of detail) {
    const loc = item.loc ?? [];
    const campo = loc.length > 1 && loc[0] === 'body' ? loc[loc.length - 1] : undefined;
    if (typeof campo !== 'string' || !item.msg || erros[campo]) continue;
    // Pydantic prefixa erros de validadores customizados com "Value error, ".
    erros[campo] = item.msg.replace(/^Value error,\s*/, '');
  }
  return erros;
}
