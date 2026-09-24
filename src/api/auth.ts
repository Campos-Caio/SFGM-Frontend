import { apiClient, LOGIN_PATH, ME_PATH } from './client';
import type { LoginResponse, MeResponse } from '../types/auth';

export const authApi = {
  /**
   * Autentica com login + senha. O backend segue o padrão OAuth2 "password":
   * corpo `application/x-www-form-urlencoded` com `username` e `password`
   * (não é JSON). Sucesso grava o cookie de sessão HttpOnly. 401 =
   * credenciais inválidas; 403 = origem não permitida; 429 = muitas tentativas.
   */
  login: async (login: string, senha: string): Promise<LoginResponse> => {
    const body = new URLSearchParams({ username: login, password: senha });
    const { data } = await apiClient.post<LoginResponse>(LOGIN_PATH, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  /** Sessão do cookie atual (usuário + csrf_token); 401 se não houver sessão. */
  me: async (): Promise<MeResponse> => {
    const { data } = await apiClient.get<MeResponse>(ME_PATH);
    return data;
  },

  /**
   * Encerra a sessão no servidor: apaga o cookie e revoga os tokens do
   * usuário em todos os dispositivos. 204 também quando não há sessão.
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
