export type LancamentoTipo = 'RECEITA' | 'DESPESA';

/**
 * De onde o lançamento veio (somente leitura). Só MANUAL pode ser editado ou
 * excluído avulso; os automáticos retornam 409 em PUT/DELETE e são corrigidos
 * pela operação que os gerou.
 */
export type LancamentoOrigem = 'MANUAL' | 'BAIXA_COBRANCA' | 'CREDITO_MEMBRO';

export const LANCAMENTO_ORIGEM_LABELS: Record<LancamentoOrigem, string> = {
  MANUAL: 'Manual',
  BAIXA_COBRANCA: 'Pagamento de cobrança',
  CREDITO_MEMBRO: 'Crédito de irmão',
};

/** Como corrigir um lançamento automático (não editável nem excluível avulso). */
export const LANCAMENTO_ORIGEM_ORIENTACAO: Record<Exclude<LancamentoOrigem, 'MANUAL'>, string> = {
  BAIXA_COBRANCA:
    'Gerado pelo pagamento de uma cobrança. Para corrigir, use "Desfazer pagamento" na cobrança do irmão.',
  CREDITO_MEMBRO:
    'Gerado pelo registro de um crédito do irmão. Para corrigir, exclua o crédito na ficha do irmão.',
};

export interface Lancamento {
  id: number;
  loja_id: number;
  tipo: LancamentoTipo;
  categoria: string;
  descricao: string | null;
  valor: string;
  data: string;
  competencia: string;
  observacao: string | null;
  origem: LancamentoOrigem;
  created_at: string;
  updated_at: string;
}

/**
 * Payload de create/update de Lancamento. Não inclui `loja_id`: a API
 * recebe a loja pela rota (`POST /lojas/{loja_id}/lancamentos`), não pelo
 * corpo.
 */
export interface LancamentoInput {
  tipo: LancamentoTipo;
  categoria: string;
  descricao?: string | null;
  valor: string;
  data: string;
  competencia: string;
  observacao?: string | null;
}
