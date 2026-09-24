import { apiClient } from './client';
import type {
  DebitoMembro,
  DebitoMembroInput,
  DebitoMembroPagamentoInput,
  DebitoMembroTipo,
  DebitosPorCompetencia,
  MotivoMembroIgnorado,
} from '../types/debito';

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

export interface MembroIgnoradoEmMassa {
  membro_id: number;
  nome: string;
  motivo: MotivoMembroIgnorado;
}

export interface DebitoEmMassaResponse {
  debitos_criados: DebitoMembro[];
  membros_ignorados: MembroIgnoradoEmMassa[];
}

/** Valor do header `X-Error-Code` do 422 de gerar-mensalidades sem item recorrente ativo. */
export const ERRO_SEM_DEBITO_RECORRENTE_ATIVO = 'SEM_DEBITO_RECORRENTE_ATIVO';

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
  /** Débitos do membro agrupados por competência (mais recente primeiro). */
  listPorCompetencia: async (
    lojaId: number,
    membroId: number
  ): Promise<DebitosPorCompetencia[]> => {
    const { data } = await apiClient.get<DebitosPorCompetencia[]>(
      `/lojas/${lojaId}/membros/${membroId}/debitos-por-competencia`
    );
    return data;
  },
  /**
   * Dá baixa (marca como PAGA) na cobrança de um membro em uma competência:
   * todos os débitos em aberto do mês, numa única transação (tudo-ou-nada).
   * `competencia` = "YYYY-MM-01". O corpo é opcional (sem ele, o servidor usa
   * a data de hoje em MS e nenhuma forma). Idempotente: cobrança já paga
   * retorna 200 com o mesmo conteúdo. Devolve a cobrança já atualizada.
   */
  pagarCobranca: async (
    lojaId: number,
    membroId: number,
    competencia: string,
    input: DebitoMembroPagamentoInput = {}
  ): Promise<DebitosPorCompetencia> => {
    const { data } = await apiClient.post<DebitosPorCompetencia>(
      `/lojas/${lojaId}/membros/${membroId}/cobrancas/${competencia}/pagar`,
      input
    );
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
  /**
   * Gera, para cada irmão ativo, um débito por item recorrente ativo da loja
   * ainda não cobrado na competência. 422 com header `X-Error-Code:
   * SEM_DEBITO_RECORRENTE_ATIVO` se a loja não tiver itens recorrentes ativos.
   */
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
  /**
   * Lança o mesmo débito avulso para todos os irmãos ativos da loja. Mesmo
   * corpo do cadastro individual. Irmãos que já têm o débito (mesmo tipo +
   * descrição na competência) ou com a competência paga são ignorados.
   */
  lancarEmMassa: async (lojaId: number, input: DebitoMembroInput): Promise<DebitoEmMassaResponse> => {
    const { data } = await apiClient.post<DebitoEmMassaResponse>(
      `/lojas/${lojaId}/debitos/em-massa`,
      input
    );
    return data;
  },
};
