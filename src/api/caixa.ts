import { apiClient } from './client';
import type { Caixa, SaldoInicialInput } from '../types/caixa';

export const caixaApi = {
  /** Caixa da Loja, sempre recalculado pelo servidor (sem cache no cliente). */
  get: async (lojaId: number): Promise<Caixa> => {
    const { data } = await apiClient.get<Caixa>(`/lojas/${lojaId}/caixa`);
    return data;
  },
  /** Define (cria ou substitui) o saldo inicial; devolve o Caixa já recalculado. */
  definirSaldoInicial: async (lojaId: number, input: SaldoInicialInput): Promise<Caixa> => {
    const { data } = await apiClient.put<Caixa>(`/lojas/${lojaId}/caixa/saldo-inicial`, input);
    return data;
  },
};
