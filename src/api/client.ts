import axios, { type AxiosError } from 'axios';

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
});

// Ponto único para injetar autenticação no futuro (ex.: header
// Authorization), sem precisar alterar cada chamada de API individualmente.
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getAuthToken(): string | null {
  // Autenticação real está fora de escopo desta migração. Este ponto existe
  // apenas para que uma implementação futura de auth não precise reescrever
  // todas as chamadas de API.
  return null;
}

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
