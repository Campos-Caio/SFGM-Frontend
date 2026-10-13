import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LancamentoDetailPage from './LancamentoDetailPage';
import { lancamentosApi } from '../../api/lancamentos';
import type { Lancamento } from '../../types/lancamento';

vi.mock('../../api/lancamentos');

const lancamento: Lancamento = {
  id: 7,
  loja_id: 1,
  tipo: 'RECEITA',
  categoria: 'Mensalidades',
  descricao: 'Mensalidade de agosto',
  valor: '100.00',
  data: '2026-08-10',
  competencia: '2026-08-01',
  observacao: null,
  origem: 'MANUAL',
  created_at: '2026-08-10T00:00:00Z',
  updated_at: '2026-08-10T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/lancamentos/7']}>
      <Routes>
        <Route path="/lancamentos/:id" element={<LancamentoDetailPage />} />
        <Route path="/lancamentos" element={<p>Lista de lançamentos</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LancamentoDetailPage — exclusão', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lancamentosApi.get).mockResolvedValue(lancamento);
  });

  it('exibe a mensagem do 409 quando o lançamento foi gerado por pagamento de cobrança', async () => {
    vi.mocked(lancamentosApi.remove).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          detail:
            "Este lancamento foi gerado pelo pagamento de uma cobranca e nao pode ser excluido diretamente. Use 'Desfazer pagamento' na cobranca do irmao.",
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText(/Use 'Desfazer pagamento' na cobranca do irmao/)
    ).toBeInTheDocument();
    expect(lancamentosApi.remove).toHaveBeenCalledWith(7);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Lista de lançamentos')).not.toBeInTheDocument();
  });
});

describe('LancamentoDetailPage — origem do lançamento', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lançamento MANUAL mostra Editar e Excluir, sem badge de origem', async () => {
    vi.mocked(lancamentosApi.get).mockResolvedValue(lancamento);
    renderPage();

    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/lancamentos/7/editar'
    );
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    expect(screen.queryByText('Pagamento de cobrança')).not.toBeInTheDocument();
    expect(screen.queryByText('Crédito de irmão')).not.toBeInTheDocument();
  });

  it('BAIXA_COBRANCA: esconde Editar/Excluir e orienta a desfazer o pagamento', async () => {
    vi.mocked(lancamentosApi.get).mockResolvedValue({ ...lancamento, origem: 'BAIXA_COBRANCA' });
    renderPage();

    expect(await screen.findByText('Pagamento de cobrança')).toBeInTheDocument();
    expect(screen.getByText(/use "Desfazer pagamento" na cobrança do irmão/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('CREDITO_MEMBRO: esconde Editar/Excluir e orienta a excluir o crédito na ficha', async () => {
    vi.mocked(lancamentosApi.get).mockResolvedValue({ ...lancamento, origem: 'CREDITO_MEMBRO' });
    renderPage();

    expect(await screen.findByText('Crédito de irmão')).toBeInTheDocument();
    expect(screen.getByText(/exclua o crédito na ficha do irmão/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });
});
