export type DebitoMembroTipo =
  | 'MENSALIDADE'
  | 'MUTUA'
  | 'COTIZACAO'
  | 'COTIZACAO_GOMS'
  | 'TAXA'
  | 'OUTRO';

export const DEBITO_TIPO_LABELS: Record<DebitoMembroTipo, string> = {
  MENSALIDADE: 'Mensalidade',
  MUTUA: 'Mútua',
  COTIZACAO: 'Cotização',
  COTIZACAO_GOMS: 'Cotização GOMS',
  TAXA: 'Taxa',
  OUTRO: 'Outro',
};

/** Situação de um único débito (pagamento por débito, tudo-ou-nada). */
export type SituacaoDebito = 'ABERTO' | 'PAGO';

/** Situação agregada de uma competência (mês) de um membro. */
export type SituacaoCompetencia = 'ABERTO' | 'PARCIAL' | 'PAGO';

export const SITUACAO_LABELS: Record<SituacaoCompetencia, string> = {
  ABERTO: 'Em aberto',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
};

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'TRANSFERENCIA' | 'DEPOSITO' | 'OUTRO';

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  TRANSFERENCIA: 'Transferência',
  DEPOSITO: 'Depósito',
  OUTRO: 'Outro',
};

export interface DebitoMembro {
  id: number;
  membro_id: number;
  tipo: DebitoMembroTipo;
  descricao: string | null;
  valor: string;
  data: string;
  competencia: string;
  observacao: string | null;
  situacao: SituacaoDebito;
  /** Timestamp (com offset) em que a baixa foi registrada no sistema. */
  pago_em: string | null;
  /** Data efetiva do pagamento ("YYYY-MM-DD"), data de negócio (fuso de MS). */
  data_pagamento: string | null;
  forma_pagamento: FormaPagamento | null;
  /** Item recorrente que gerou o débito (null para débito avulso/manual). */
  debito_recorrente_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * "Cobrança" de um membro em uma competência: soma de todos os débitos do mês
 * (o "boleto"). A situação pertence à cobrança, não a cada débito. É o item de
 * `GET /lojas/{loja_id}/membros/{membro_id}/debitos-por-competencia` e também
 * a resposta de `POST .../cobrancas/{competencia}/pagar`. PARCIAL só existe em
 * dados legados.
 */
export interface DebitosPorCompetencia {
  competencia: string;
  situacao: SituacaoCompetencia;
  /** Decimal serializado como string. Calculado pelo servidor. */
  total: string;
  total_em_aberto: string;
  debitos: DebitoMembro[];
}

/**
 * Item de `GET /lojas/{loja_id}/cobrancas`: a cobrança de um membro em uma
 * competência (mesmo formato de `DebitosPorCompetencia`) mais a identificação
 * do membro. Ordenado por competência DESC e depois `membro_nome` ASC.
 */
export interface CobrancaLoja extends DebitosPorCompetencia {
  membro_id: number;
  membro_nome: string;
}

/**
 * Corpo opcional de `POST .../cobrancas/{competencia}/pagar`. Sem corpo, o
 * servidor usa a data de hoje (fuso de MS) e nenhuma forma de pagamento.
 * Chaves vazias devem ser omitidas (não enviar null).
 */
export interface DebitoMembroPagamentoInput {
  data_pagamento?: string;
  forma_pagamento?: FormaPagamento;
}

/**
 * Payload de create/update de DebitoMembro. Não inclui `membro_id`: a API
 * recebe o membro pela rota (`POST /membros/{membro_id}/debitos`), não pelo
 * corpo — e o `DebitoMembroUpdate` do backend não permite reatribuir o
 * débito a outro membro.
 */
export interface DebitoMembroInput {
  tipo: DebitoMembroTipo;
  descricao?: string | null;
  valor: string;
  data: string;
  competencia: string;
  observacao?: string | null;
}

/**
 * Item de débito recorrente da Loja (ex.: Mensalidade, Cotização): cada item
 * ativo gera um débito por irmão ativo em `gerar-mensalidades`.
 * `GET /lojas/{loja_id}/debitos-recorrentes` devolve ordenado por (ordem, id).
 */
export interface DebitoRecorrente {
  id: number;
  loja_id: number;
  tipo: DebitoMembroTipo;
  descricao: string;
  /** Decimal serializado como string. */
  valor: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/** Payload de create/update (PUT = substituição completa) de DebitoRecorrente. */
export interface DebitoRecorrenteInput {
  tipo: DebitoMembroTipo;
  descricao: string;
  valor: string;
  ativo: boolean;
  ordem: number;
}

/** Motivo pelo qual um irmão ativo não recebeu o débito lançado em massa. */
export type MotivoMembroIgnorado = 'COMPETENCIA_PAGA' | 'DEBITO_JA_EXISTENTE';

export const MOTIVO_IGNORADO_LABELS: Record<MotivoMembroIgnorado, string> = {
  COMPETENCIA_PAGA: 'competência já paga',
  DEBITO_JA_EXISTENTE: 'já possui este débito na competência',
};
