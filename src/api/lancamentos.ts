import { apiClient } from './client';
import type { Lancamento, LancamentoInput, LancamentoTipo } from '../types/lancamento';

export interface LancamentosFiltro {
  competencia?: string;
  tipo?: LancamentoTipo;
}

export const lancamentosApi = {
  listByLoja: async (
    lojaId: number,
    filtro: LancamentosFiltro = {}
  ): Promise<Lancamento[]> => {
    const { data } = await apiClient.get<Lancamento[]>(`/lojas/${lojaId}/lancamentos`, {
      params: filtro,
    });
    return data;
  },
  get: async (id: number): Promise<Lancamento> => {
    const { data } = await apiClient.get<Lancamento>(`/lancamentos/${id}`);
    return data;
  },
  create: async (lojaId: number, input: LancamentoInput): Promise<Lancamento> => {
    const { data } = await apiClient.post<Lancamento>(
      `/lojas/${lojaId}/lancamentos`,
      input
    );
    return data;
  },
  update: async (id: number, input: LancamentoInput): Promise<Lancamento> => {
    const { data } = await apiClient.put<Lancamento>(`/lancamentos/${id}`, input);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/lancamentos/${id}`);
  },
};
