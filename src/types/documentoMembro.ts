import type { Loja } from './loja';
import type { Membro } from './membro';
import type { DebitoMembro } from './debito';
import type { PrestacaoContas } from './prestacaoContas';

export interface DocumentoMembroData {
  loja: Loja;
  membro: Membro;
  competencia_cobranca: string;
  competencia_prestacao: string;
  debitos: DebitoMembro[];
  total_debitos: string;
  prestacao_contas: PrestacaoContas;
}
