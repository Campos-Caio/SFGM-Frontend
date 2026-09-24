import { apiClient } from './client';
import type { DebitoRecorrente, DebitoRecorrenteInput } from '../types/debito';

/**
 * Débitos recorrentes da Loja (`/lojas/{loja_id}/debitos-recorrentes`): os
 * itens gerados para cada irmão ativo em "Gerar mensalidades".
 */
export const debitosRecorrentesApi = {
  /** Lista ativos e inativos, na ordem de geração (ordem, id). */
  list: async (lojaId: number): Promise<DebitoRecorrente[]> => {
    const { data } = await apiClient.get<DebitoRecorrente[]>(
      `/lojas/${lojaId}/debitos-recorrentes`
    );
    return data;
  },
  get: async (lojaId: number, id: number): Promise<DebitoRecorrente> => {
    const { data } = await apiClient.get<DebitoRecorrente>(
      `/lojas/${lojaId}/debitos-recorrentes/${id}`
    );
    return data;
  },
  /** 409 se já existir item com a mesma descrição na loja. */
  create: async (lojaId: number, input: DebitoRecorrenteInput): Promise<DebitoRecorrente> => {
    const { data } = await apiClient.post<DebitoRecorrente>(
      `/lojas/${lojaId}/debitos-recorrentes`,
      input
    );
    return data;
  },
  /** Substituição completa (envie todos os campos). Não altera débitos já gerados. */
  update: async (
    lojaId: number,
    id: number,
    input: DebitoRecorrenteInput
  ): Promise<DebitoRecorrente> => {
    const { data } = await apiClient.put<DebitoRecorrente>(
      `/lojas/${lojaId}/debitos-recorrentes/${id}`,
      input
    );
    return data;
  },
  /** 409 se o item já gerou débitos (nesse caso, desative-o). */
  remove: async (lojaId: number, id: number): Promise<void> => {
    await apiClient.delete(`/lojas/${lojaId}/debitos-recorrentes/${id}`);
  },
};
