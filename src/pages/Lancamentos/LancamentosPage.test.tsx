import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LancamentosPage from './LancamentosPage';
import { lojaApi } from '../../api/loja';
import { lancamentosApi } from '../../api/lancamentos';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import type { Loja } from '../../types/loja';
import type { Lancamento } from '../../types/lancamento';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/lancamentos');
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

const lancamento: Lancamento = {
  id: 10,
  loja_id: 1,
  tipo: 'RECEITA',
  categoria: 'Mensalidades',
  descricao: 'Mensalidade de agosto',
  valor: '100.00',
  data: '2026-08-05',
  competencia: '2026-08-01',
  observacao: null,
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

const prestacao: PrestacaoContas = {
  loja_id: 1,
  competencia: '2026-08-01',
  receitas: [{ categoria: 'Mensalidades', descricao: null, valor: '100.00' }],
  total_receitas: '100.00',
  despesas: [],
  total_despesas: '0.00',
  resultado: '100.00',
};

// Instante de fronteira: 2026-09-01T02:30Z é 31/08/2026 22:30 em MS (UTC-4).
// O app deve usar o mês de MS ("2026-08"), e não o de UTC ("2026-09"),
// independentemente do fuso do ambiente que roda os testes.
const AGORA = new Date('2026-09-01T02:30:00Z');

function mesAtualInput(): string {
  return '2026-08';
}

function renderPage(initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/lancamentos']) {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/lancamentos" element={<LancamentosPage />} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

describe('LancamentosPage — filtros, indicadores e lista', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(AGORA);
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(prestacaoContasApi.get).mockResolvedValue(prestacao);
    vi.mocked(lancamentosApi.listByLoja).mockResolvedValue([lancamento]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ao carregar, usa o mês atual como competência padrão e busca resumo + lista', async () => {
    renderPage();

    const mesAtual = `${mesAtualInput()}-01`;
    await waitFor(() =>
      expect(prestacaoContasApi.get).toHaveBeenCalledWith(1, mesAtual)
    );
    await waitFor(() =>
      expect(lancamentosApi.listByLoja).toHaveBeenCalledWith(1, {
        competencia: mesAtual,
        tipo: undefined,
      })
    );

    expect(screen.getByLabelText('Competência')).toHaveValue(mesAtualInput());
    await waitFor(() =>
      expect(screen.getByText('Mensalidade de agosto')).toBeInTheDocument()
    );
    expect(screen.getByText('Receitas')).toBeInTheDocument();
    expect(screen.getByText('Despesas')).toBeInTheDocument();
    expect(screen.getByText('Resultado')).toBeInTheDocument();
  });

  it('ao filtrar por competência, recarrega resumo e lista com a nova competência usando um único formulário/botão', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(prestacaoContasApi.get).toHaveBeenCalledTimes(1));

    const competenciaInput = screen.getByLabelText('Competência');
    await user.clear(competenciaInput);
    await user.type(competenciaInput, '2026-07');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() =>
      expect(prestacaoContasApi.get).toHaveBeenLastCalledWith(1, '2026-07-01')
    );
    await waitFor(() =>
      expect(lancamentosApi.listByLoja).toHaveBeenLastCalledWith(1, {
        competencia: '2026-07-01',
        tipo: undefined,
      })
    );
  });

  it('ao selecionar um tipo e filtrar, recarrega resumo e lista com a competência atual e o tipo selecionado', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Mensalidade de agosto')).toBeInTheDocument()
    );

    await user.selectOptions(screen.getByLabelText('Tipo'), 'RECEITA');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    const mesAtual = `${mesAtualInput()}-01`;
    await waitFor(() =>
      expect(lancamentosApi.listByLoja).toHaveBeenLastCalledWith(1, {
        competencia: mesAtual,
        tipo: 'RECEITA',
      })
    );
    await waitFor(() =>
      expect(prestacaoContasApi.get).toHaveBeenLastCalledWith(1, mesAtual)
    );
  });

  it('exibe um único link para cadastrar novo lançamento (no cabeçalho), sem duplicar no estado vazio', async () => {
    vi.mocked(lancamentosApi.listByLoja).mockResolvedValue([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Nenhum lançamento encontrado')).toBeInTheDocument()
    );

    const links = screen.getAllByRole('link', { name: /lançamento/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/lancamentos/novo');
    expect(links[0]).toHaveTextContent('Novo lançamento');
  });

  it('mostra mensagem de sucesso após exclusão e usa a competência recebida via navegação', async () => {
    renderPage([
      { pathname: '/lancamentos', state: { sucesso: 'excluido', competencia: '2026-05-01' } },
    ]);

    await waitFor(() =>
      expect(screen.getByText(/Lançamento excluído com sucesso\./)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(prestacaoContasApi.get).toHaveBeenCalledWith(1, '2026-05-01')
    );
    expect(screen.getByLabelText('Competência')).toHaveValue('2026-05');
  });
});
