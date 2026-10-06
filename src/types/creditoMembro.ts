import type { FormaPagamento, FormaPagamentoEntrada } from './debito';
import type { MembroStatus } from './membro';

/**
 * Situação financeira do irmão perante a loja, derivada pelo servidor do sinal
 * do `saldo`: CREDOR (> 0), DEVEDOR (< 0) ou EM_DIA (= 0).
 */
export type SituacaoSaldo = 'CREDOR' | 'DEVEDOR' | 'EM_DIA';

export const SITUACAO_SALDO_LABELS: Record<SituacaoSaldo, string> = {
  CREDOR: 'Credor',
  DEVEDOR: 'Devedor',
  EM_DIA: 'Em dia',
};

/**
 * Saldo do irmão (visão derivada, recalculada pelo servidor a cada leitura).
 * Item de `GET /lojas/{loja_id}/saldos-membros` e resposta de
 * `GET /lojas/{loja_id}/membros/{membro_id}/saldo`. Decimais como string.
 *
 * - `total_em_aberto`: débitos não pagos de competências até o mês corrente (a dívida);
 * - `total_a_vencer`: débitos não pagos de competências futuras (não são dívida);
 * - `total_credito`: crédito disponível do irmão;
 * - `saldo = total_credito - total_em_aberto`. O irmão pode ter crédito e
 *   dívida ao mesmo tempo: o crédito só quita uma cobrança quando o
 *   tesoureiro o usa.
 */
export interface SaldoMembro {
  membro_id: number;
  membro_nome: string;
  membro_status: MembroStatus;
  total_em_aberto: string;
  total_a_vencer: string;
  qtd_cobrancas_em_aberto: number;
  total_credito: string;
  saldo: string;
  situacao: SituacaoSaldo;
}

/** ENTRADA = dinheiro adiantado pelo irmão; UTILIZACAO = crédito usado para quitar uma cobrança. */
export type MovimentoCreditoTipo = 'ENTRADA' | 'UTILIZACAO';

export const MOVIMENTO_CREDITO_TIPO_LABELS: Record<MovimentoCreditoTipo, string> = {
  ENTRADA: 'Entrada',
  UTILIZACAO: 'Utilização',
};

/** Item do extrato `GET /lojas/{loja_id}/membros/{membro_id}/creditos` (mais recente primeiro). */
export interface MovimentoCredito {
  id: number;
  membro_id: number;
  tipo: MovimentoCreditoTipo;
  valor: string;
  /** "YYYY-MM-DD" (data de negócio). */
  data: string;
  forma_pagamento: FormaPagamento | null;
  /** Lançamento de RECEITA gerado pela ENTRADA (null em UTILIZACAO). */
  lancamento_id: number | null;
  observacao: string | null;
  created_at: string;
  /** Competência ("YYYY-MM-01") da cobrança quitada por uma UTILIZACAO (null em ENTRADA). */
  competencia_quitada: string | null;
}

/**
 * Corpo de `POST /lojas/{loja_id}/membros/{membro_id}/creditos`. Chaves
 * opcionais vazias devem ser omitidas: sem `data` o servidor usa hoje (MS);
 * sem `categoria`, "Mensalidade". `forma_pagamento` nunca é `CREDITO` (422).
 */
export interface CreditoEntradaInput {
  valor: string;
  data?: string;
  forma_pagamento?: FormaPagamentoEntrada;
  categoria?: string;
  observacao?: string;
}

/** Categoria padrão do lançamento de receita gerado pelo crédito (mesma do servidor). */
export const CATEGORIA_PADRAO_CREDITO = 'Mensalidade';
