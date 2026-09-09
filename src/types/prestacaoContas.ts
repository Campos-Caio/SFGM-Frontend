export interface PrestacaoContasItem {
  categoria: string;
  descricao: string | null;
  valor: string;
}

export interface PrestacaoContas {
  loja_id: number;
  competencia: string;
  receitas: PrestacaoContasItem[];
  total_receitas: string;
  despesas: PrestacaoContasItem[];
  total_despesas: string;
  resultado: string;
}
