export type MembroStatus = 'ATIVO' | 'INATIVO';

export interface Membro {
  id: number;
  loja_id: number;
  nome: string;
  cim: string;
  telefone: string | null;
  email: string | null;
  status: MembroStatus;
  created_at: string;
  updated_at: string;
}

export interface MembroCreateInput {
  loja_id: number;
  nome: string;
  cim: string;
  telefone?: string | null;
  email?: string | null;
}

export interface MembroUpdateInput {
  nome: string;
  cim: string;
  telefone?: string | null;
  email?: string | null;
}
