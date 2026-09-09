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

export interface DebitoMembro {
  id: number;
  membro_id: number;
  tipo: DebitoMembroTipo;
  descricao: string | null;
  valor: string;
  data: string;
  competencia: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
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
