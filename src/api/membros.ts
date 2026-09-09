import { apiClient } from './client';
import type {
  Membro,
  MembroCreateInput,
  MembroStatus,
  MembroUpdateInput,
} from '../types/membro';

export const membrosApi = {
  list: async (lojaId: number): Promise<Membro[]> => {
    const { data } = await apiClient.get<Membro[]>('/membros', {
      params: { loja_id: lojaId },
    });
    return data;
  },
  get: async (id: number): Promise<Membro> => {
    const { data } = await apiClient.get<Membro>(`/membros/${id}`);
    return data;
  },
  create: async (input: MembroCreateInput): Promise<Membro> => {
    const { data } = await apiClient.post<Membro>('/membros', input);
    return data;
  },
  update: async (id: number, input: MembroUpdateInput): Promise<Membro> => {
    const { data } = await apiClient.put<Membro>(`/membros/${id}`, input);
    return data;
  },
  updateStatus: async (id: number, status: MembroStatus): Promise<Membro> => {
    const { data } = await apiClient.patch<Membro>(`/membros/${id}/status`, {
      status,
    });
    return data;
  },
};
