import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrestacaoContasPage from './PrestacaoContasPage';
import { lojaApi } from '../../api/loja';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import type { Loja } from '../../types/loja';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/prestacaoContas');

const loja: Loja = {
  id: 1,
  nome: 'Loja Teste',
  numero: '123',
  cnpj: '00.000.000/0001-00',
  logo_url: null,
  telefone: null,
  email: null,
  pix_chave: null,
  pix_descricao: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const prestacao: PrestacaoContas = {
  loja_id: 1,
  competencia: '2026-08-01',
  receitas: [{ categoria: 'Mensalidades', descricao: null, valor: '100.00' }],
  total_receitas: '100.00',
  despesas: [{ categoria: 'Aluguel', descricao: null, valor: '50.00' }],
  total_despesas: '50.00',
  resultado: '50.00',
};

function renderPage() {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={['/prestacao-contas']}>
      <Routes>
        <Route path="/prestacao-contas" element={<PrestacaoContasPage />} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

// Instante de fronteira: 2026-09-01T02:30Z é 31/08/2026 22:30 em MS (UTC-4).
// O app deve usar o mês de MS ("2026-08"), e não o de UTC ("2026-09"),
// independentemente do fuso do ambiente que roda os testes.
const AGORA = new Date('2026-09-01T02:30:00Z');

function mesAtualInput(): string {
  return '2026-08';
}

describe('PrestacaoContasPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(AGORA);
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(prestacaoContasApi.get).mockResolvedValue(prestacao);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca a prestação de contas do mês atual ao carregar e exibe receitas, despesas e resultado', async () => {
    renderPage();

    const mesAtual = `${mesAtualInput()}-01`;
    await waitFor(() => expect(prestacaoContasApi.get).toHaveBeenCalledWith(1, mesAtual));

    expect(await screen.findByText('Mensalidades')).toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    // Os totais aparecem tanto no StatCard quanto na tabela de categorias.
    expect(screen.getAllByText('R$ 100,00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('R$ 50,00').length).toBeGreaterThanOrEqual(2);
  });

  it('refaz a busca ao filtrar por outra competência', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(prestacaoContasApi.get).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText('Competência');
    await user.clear(input);
    await user.type(input, '2026-07');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => expect(prestacaoContasApi.get).toHaveBeenLastCalledWith(1, '2026-07-01'));
  });

  it('mostra aviso quando não há loja cadastrada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument()
    );
    expect(prestacaoContasApi.get).not.toHaveBeenCalled();
  });
});
