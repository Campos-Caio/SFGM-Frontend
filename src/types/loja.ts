export interface Loja {
  id: number;
  nome: string;
  numero: string;
  cnpj: string;
  logo_url: string | null;
  telefone: string | null;
  email: string | null;
  pix_chave: string | null;
  pix_descricao: string | null;
  created_at: string;
  updated_at: string;
}

export interface LojaInput {
  nome: string;
  numero: string;
  cnpj: string;
  logo_url?: string | null;
  telefone?: string | null;
  email?: string | null;
  pix_chave?: string | null;
  pix_descricao?: string | null;
}
