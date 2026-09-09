import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { lojaApi } from '../../api/loja';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import { debitosApi } from '../../api/debitos';
import type { Loja } from '../../types/loja';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import type { DebitoMembro } from '../../types/debito';

vi.mock('../../api/loja');
vi.mock('../../api/prestacaoContas');
vi.mock('../../api/debitos');

const loja: Loja = {
  id: 1,
  nome: 'Templários do Asfalto',
  numero: '28',
  cnpj: '00.000.000/0001-00',
  logo_url: null,
  telefone: null,
  email: null,
  pix_chave: null,
  pix_descricao: null,
  mensalidade_valor: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const prestacao: PrestacaoContas = {
  loja_id: 1,
  competencia: '2026-08-01',
  receitas: [],
  total_receitas: '200.00',
  despesas: [],
  total_despesas: '80.00',
  resultado: '120.00',
};

const debito: DebitoMembro = {
  id: 1,
  membro_id: 5,
  tipo: 'MENSALIDADE',
  descricao: null,
  valor: '80.00',
  data: '2026-08-05',
  competencia: '2026-08-01',
  observacao: null,
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(prestacaoContasApi.get).mockResolvedValue(prestacao);
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito]);
  });

  it('exibe o nome da loja e os indicadores do mês atual', async () => {
    renderPage();

    expect(await screen.findByText(/Templários do Asfalto nº 28/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('R$ 200,00')).toBeInTheDocument());
    expect(screen.getByText('R$ 80,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument();
    expect(screen.getByText('Débitos do mês')).toBeInTheDocument();
  });

  it('exibe atalhos de ações rápidas para as tarefas mais comuns', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('R$ 200,00')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Novo lançamento/i })).toHaveAttribute(
      'href',
      '/lancamentos/novo'
    );
    expect(screen.getByRole('link', { name: /Novo débito/i })).toHaveAttribute('href', '/debitos/novo');
    expect(screen.getByRole('link', { name: /Gerar mensalidades/i })).toHaveAttribute('href', '/debitos');
  });

  it('mostra aviso quando não há loja cadastrada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument()
    );
  });
});
