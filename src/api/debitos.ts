import { apiClient } from './client';
import type { DebitoMembro, DebitoMembroInput, DebitoMembroTipo } from '../types/debito';

export interface DebitosFiltro {
  competencia?: string;
  membro_id?: number;
  tipo?: DebitoMembroTipo;
}

export interface MembroJaCobrado {
  membro_id: number;
  nome: string;
}

export interface GerarMensalidadesResponse {
  debitos_criados: DebitoMembro[];
  membros_ja_cobrados: MembroJaCobrado[];
}

export const debitosApi = {
  /** Lista débitos de uma loja com filtros opcionais (tela de listagem). */
  listByLoja: async (lojaId: number, filtro: DebitosFiltro = {}): Promise<DebitoMembro[]> => {
    const { data } = await apiClient.get<DebitoMembro[]>(`/lojas/${lojaId}/debitos`, {
      params: filtro,
    });
    return data;
  },
  listByMembro: async (membroId: number, competencia?: string): Promise<DebitoMembro[]> => {
    const { data } = await apiClient.get<DebitoMembro[]>(`/membros/${membroId}/debitos`, {
      params: competencia ? { competencia } : undefined,
    });
    return data;
  },
  get: async (id: number): Promise<DebitoMembro> => {
    const { data } = await apiClient.get<DebitoMembro>(`/debitos/${id}`);
    return data;
  },
  create: async (membroId: number, input: DebitoMembroInput): Promise<DebitoMembro> => {
    const { data } = await apiClient.post<DebitoMembro>(
      `/membros/${membroId}/debitos`,
      input
    );
    return data;
  },
  update: async (id: number, input: DebitoMembroInput): Promise<DebitoMembro> => {
    const { data } = await apiClient.put<DebitoMembro>(`/debitos/${id}`, input);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/debitos/${id}`);
  },
  /** Gera débitos de mensalidade para todos os membros ainda não cobrados na competência. */
  gerarMensalidades: async (
    lojaId: number,
    competencia: string
  ): Promise<GerarMensalidadesResponse> => {
    const { data } = await apiClient.post<GerarMensalidadesResponse>(
      `/lojas/${lojaId}/debitos/gerar-mensalidades`,
      null,
      { params: { competencia } }
    );
    return data;
  },
};
