import { apiClient } from './client';
import type {
  CreditoEntradaInput,
  MovimentoCredito,
  SaldoMembro,
  SituacaoSaldo,
} from '../types/creditoMembro';
import type { MembroStatus } from '../types/membro';

/** Filtros opcionais (combináveis, aplicados no servidor) da lista de saldos. */
export interface SaldosFiltro {
  situacao?: SituacaoSaldo;
  status?: MembroStatus;
}

/** Saldo (em aberto / a vencer / crédito) e crédito adiantado dos irmãos. */
export const creditosMembroApi = {
  /** Saldo de um irmão. 404 se a loja ou o membro não existir (ou for de outra loja). */
  getSaldo: async (lojaId: number, membroId: number): Promise<SaldoMembro> => {
    const { data } = await apiClient.get<SaldoMembro>(
      `/lojas/${lojaId}/membros/${membroId}/saldo`
    );
    return data;
  },
  /** Saldo de todos os irmãos da loja (ativos e inativos), ordenado por nome. */
  listSaldos: async (lojaId: number, filtro: SaldosFiltro = {}): Promise<SaldoMembro[]> => {
    const { data } = await apiClient.get<SaldoMembro[]>(`/lojas/${lojaId}/saldos-membros`, {
      params: filtro,
    });
    return data;
  },
  /** Extrato do crédito do irmão (entradas e utilizações), do mais recente ao mais antigo. */
  listMovimentos: async (lojaId: number, membroId: number): Promise<MovimentoCredito[]> => {
    const { data } = await apiClient.get<MovimentoCredito[]>(
      `/lojas/${lojaId}/membros/${membroId}/creditos`
    );
    return data;
  },
  /**
   * Registra um crédito adiantado (ENTRADA). Gera um lançamento de RECEITA no
   * mês do recebimento. 409 se o irmão estiver INATIVO; 422 por campo.
   */
  registrar: async (
    lojaId: number,
    membroId: number,
    input: CreditoEntradaInput
  ): Promise<MovimentoCredito> => {
    const { data } = await apiClient.post<MovimentoCredito>(
      `/lojas/${lojaId}/membros/${membroId}/creditos`,
      input
    );
    return data;
  },
  /**
   * Exclui uma ENTRADA registrada por engano (e o lançamento de receita dela).
   * 409 se o movimento não for uma entrada ou se o crédito já tiver sido usado.
   */
  excluir: async (lojaId: number, membroId: number, movimentoId: number): Promise<void> => {
    await apiClient.delete(`/lojas/${lojaId}/membros/${membroId}/creditos/${movimentoId}`);
  },
};
