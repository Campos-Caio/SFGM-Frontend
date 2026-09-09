import { apiClient } from './client';
import type { DocumentoMembroData } from '../types/documentoMembro';

export const documentosApi = {
  get: async (
    lojaId: number,
    membroId: number,
    competencia: string
  ): Promise<DocumentoMembroData> => {
    const { data } = await apiClient.get<DocumentoMembroData>(
      `/lojas/${lojaId}/membros/${membroId}/documento`,
      { params: { competencia } }
    );
    return data;
  },

  /**
   * Busca o PDF binário do documento e retorna um Blob pronto para
   * download/preview. A geração do PDF acontece inteiramente no backend.
   */
  getPdfBlob: async (
    lojaId: number,
    membroId: number,
    competencia: string
  ): Promise<{ blob: Blob; filename: string | null }> => {
    const response = await apiClient.get(
      `/lojas/${lojaId}/membros/${membroId}/documento/pdf`,
      { params: { competencia }, responseType: 'blob' }
    );

    const disposition: string | undefined = response.headers['content-disposition'];
    const match = disposition?.match(/filename="?([^"]+)"?/);

    return {
      blob: response.data,
      filename: match ? match[1] : null,
    };
  },
};
