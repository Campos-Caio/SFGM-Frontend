import { apiClient } from './client';
import type { PrestacaoContas } from '../types/prestacaoContas';

export const prestacaoContasApi = {
  get: async (lojaId: number, competencia: string): Promise<PrestacaoContas> => {
    const { data } = await apiClient.get<PrestacaoContas>(
      `/lojas/${lojaId}/prestacao-contas`,
      { params: { competencia } }
    );
    return data;
  },
};
