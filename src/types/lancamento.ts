export type LancamentoTipo = 'RECEITA' | 'DESPESA';

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
