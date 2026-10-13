import type { MembroStatus } from './membro';

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

/**
 * Forma de pagamento como vem nas respostas da API. `CREDITO` é gravada SOMENTE
 * pelo pagamento de cobrança com o crédito do irmão (`.../pagar-com-credito`):
 * enviá-la em qualquer payload resulta em 422. Para entrada use
 * `FormaPagamentoEntrada` / `FORMAS_PAGAMENTO_SELECIONAVEIS`.
 */
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'TRANSFERENCIA' | 'DEPOSITO' | 'OUTRO' | 'CREDITO';

/** Formas aceitas em payloads (todas, exceto `CREDITO`). */
export type FormaPagamentoEntrada = Exclude<FormaPagamento, 'CREDITO'>;

/** Rótulos de exibição (inclui `CREDITO`, que só aparece em respostas). */
export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  TRANSFERENCIA: 'Transferência',
  DEPOSITO: 'Depósito',
  OUTRO: 'Outro',
  CREDITO: 'Crédito do irmão',
};

/** Opções dos selects de forma de pagamento (na ordem de exibição; sem `CREDITO`). */
export const FORMAS_PAGAMENTO_SELECIONAVEIS: FormaPagamentoEntrada[] = [
  'DINHEIRO',
  'PIX',
  'TRANSFERENCIA',
  'DEPOSITO',
  'OUTRO',
];

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
 * Dados da baixa com excedente de uma cobrança: o irmão entregou mais que o
 * valor em aberto, o valor recebido inteiro virou uma ENTRADA de crédito e a
 * cobrança foi quitada com esse crédito (os débitos vêm com forma `CREDITO`).
 * Decimais como string.
 */
export interface PagamentoExcedente {
  /** ENTRADA de crédito registrada na baixa (id no extrato do irmão). */
  movimento_credito_id: number;
  /** Valor entregue pelo irmão (valor da ENTRADA). */
  valor_recebido: string;
  /** Parte que sobrou como crédito: `valor_recebido` − valor quitado. */
  valor_excedente: string;
  /** `false` quando o desfazer em modo `CANCELAR_TUDO` seria recusado (409). */
  pode_cancelar_tudo: boolean;
  /** Explicação legível do bloqueio (quando `pode_cancelar_tudo` é `false`). */
  motivo_bloqueio: string | null;
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
  /**
   * Preenchido somente quando a cobrança foi quitada por uma baixa com
   * excedente (o irmão pagou a mais) ainda não desfeita; `null` nos demais casos.
   */
  pagamento_excedente: PagamentoExcedente | null;
}

/**
 * Item de `GET /lojas/{loja_id}/cobrancas`: a cobrança de um membro em uma
 * competência (mesmo formato de `DebitosPorCompetencia`) mais a identificação
 * do membro. Ordenado por competência DESC e depois `membro_nome` ASC.
 */
export interface CobrancaLoja extends DebitosPorCompetencia {
  membro_id: number;
  membro_nome: string;
  membro_status: MembroStatus;
}

/**
 * Corpo opcional de `POST .../cobrancas/{competencia}/pagar`. Sem corpo, o
 * servidor usa a data de hoje (fuso de MS) e nenhuma forma de pagamento.
 * Chaves vazias devem ser omitidas (não enviar null).
 *
 * `valor_recebido` (baixa com excedente): quanto o irmão entregou. Maior que o
 * valor em aberto, a diferença fica como crédito dele; igual, é a baixa
 * normal; menor, 409. Irmão INATIVO com excedente: 409. `categoria_credito` é
 * a categoria da receita gerada (padrão do servidor: "Mensalidade"), usada só
 * quando há excedente.
 */
export interface DebitoMembroPagamentoInput {
  data_pagamento?: string;
  forma_pagamento?: FormaPagamentoEntrada;
  valor_recebido?: string;
  categoria_credito?: string;
}

/**
 * O que `POST .../cobrancas/{competencia}/desfazer-pagamento` desfaz.
 * `SOMENTE_PAGAMENTO` (padrão do servidor): reabre a cobrança; numa baixa com
 * excedente, o valor recebido inteiro continua como crédito do irmão.
 * `CANCELAR_TUDO` (só para baixa com excedente): reabre a cobrança e exclui a
 * entrada de crédito e a receita dela; 409 se estiver bloqueado.
 */
export type ModoDesfazerPagamento = 'SOMENTE_PAGAMENTO' | 'CANCELAR_TUDO';

/**
 * Corpo opcional de `POST .../cobrancas/{competencia}/pagar-com-credito`. Sem
 * `data_pagamento`, o servidor usa hoje (fuso de MS). A forma gravada é sempre
 * `CREDITO` (não é enviada).
 */
export interface PagarComCreditoInput {
  data_pagamento?: string;
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
