import { apiClient } from './client';
import type { Loja, LojaInput } from '../types/loja';

export const lojaApi = {
  list: async (): Promise<Loja[]> => {
    const { data } = await apiClient.get<Loja[]>('/loja');
    return data;
  },
  get: async (id: number): Promise<Loja> => {
    const { data } = await apiClient.get<Loja>(`/loja/${id}`);
    return data;
  },
  create: async (input: LojaInput): Promise<Loja> => {
    const { data } = await apiClient.post<Loja>('/loja', input);
    return data;
  },
  update: async (id: number, input: LojaInput): Promise<Loja> => {
    const { data } = await apiClient.put<Loja>(`/loja/${id}`, input);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/loja/${id}`);
  },
};
