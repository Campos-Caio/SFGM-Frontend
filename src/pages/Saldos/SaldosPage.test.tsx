import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SaldosPage from './SaldosPage';
import { lojaApi } from '../../api/loja';
import { creditosMembroApi } from '../../api/creditosMembro';
import { StoreProvider } from '../../store/StoreProvider';
import type { Loja } from '../../types/loja';
import type { SaldoMembro } from '../../types/creditoMembro';

vi.mock('../../api/loja');
vi.mock('../../api/creditosMembro');

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

const alice: SaldoMembro = {
  membro_id: 5,
  membro_nome: 'Alice',
  membro_status: 'ATIVO',
  total_em_aberto: '180.00',
  total_a_vencer: '150.00',
  qtd_cobrancas_em_aberto: 1,
  total_credito: '30.00',
  saldo: '-150.00',
  situacao: 'DEVEDOR',
};
const bruno: SaldoMembro = {
  membro_id: 6,
  membro_nome: 'Bruno',
  membro_status: 'INATIVO',
  total_em_aberto: '0.00',
  total_a_vencer: '0.00',
  qtd_cobrancas_em_aberto: 0,
  total_credito: '45.50',
  saldo: '45.50',
  situacao: 'CREDOR',
};

function renderPage(url = '/saldos') {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/saldos" element={<SaldosPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>
  );
}

function linhaDe(nome: string): HTMLElement {
  return screen.getByRole('link', { name: nome }).closest('tr') as HTMLElement;
}

describe('SaldosPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(creditosMembroApi.listSaldos).mockResolvedValue([alice, bruno]);
  });

  it('lista todos os irmãos com em aberto, a vencer, crédito e saldo rotulado, e os totais', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: 'Alice' })).toHaveAttribute('href', '/membros/5');
    expect(creditosMembroApi.listSaldos).toHaveBeenCalledWith(1, {
      situacao: undefined,
      status: undefined,
    });

    const a = linhaDe('Alice');
    expect(within(a).getByText('Ativo')).toBeInTheDocument();
    expect(within(a).getByText('R$ 180,00')).toBeInTheDocument();
    expect(within(a).getByText('R$ 150,00')).toBeInTheDocument();
    expect(within(a).getByText('R$ 30,00')).toBeInTheDocument();
    expect(within(a).getByText('Deve R$ 150,00')).toBeInTheDocument();
    expect(within(a).getByText('Devedor')).toBeInTheDocument();

    const b = linhaDe('Bruno');
    expect(within(b).getByText('Inativo')).toBeInTheDocument();
    expect(within(b).getByText('Crédito de R$ 45,50')).toBeInTheDocument();
    expect(within(b).getByText('Credor')).toBeInTheDocument();

    const totais = screen.getByText(/2 irmão\(s\)/);
    expect(totais).toHaveTextContent(
      /Em aberto R\$\s180,00 · A vencer R\$\s150,00 · Crédito R\$\s75,50/
    );
  });

  it('aplica o filtro de situação vindo da URL (link do painel)', async () => {
    vi.mocked(creditosMembroApi.listSaldos).mockResolvedValue([alice]);
    renderPage('/saldos?situacao=DEVEDOR');

    expect(await screen.findByRole('link', { name: 'Alice' })).toBeInTheDocument();
    expect(creditosMembroApi.listSaldos).toHaveBeenCalledWith(1, {
      situacao: 'DEVEDOR',
      status: undefined,
    });
    expect(screen.getByLabelText('Situação')).toHaveValue('DEVEDOR');
  });

  it('ignora valores desconhecidos na URL', async () => {
    renderPage('/saldos?situacao=XPTO&status=abc');

    await screen.findByRole('link', { name: 'Alice' });
    expect(creditosMembroApi.listSaldos).toHaveBeenCalledWith(1, {
      situacao: undefined,
      status: undefined,
    });
  });

  it('filtra no servidor por situação e status e "Limpar" volta a todos', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('link', { name: 'Alice' });
    await user.selectOptions(screen.getByLabelText('Situação'), 'CREDOR');
    await user.selectOptions(screen.getByLabelText('Status do irmão'), 'INATIVO');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() =>
      expect(creditosMembroApi.listSaldos).toHaveBeenLastCalledWith(1, {
        situacao: 'CREDOR',
        status: 'INATIVO',
      })
    );

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() =>
      expect(creditosMembroApi.listSaldos).toHaveBeenLastCalledWith(1, {
        situacao: undefined,
        status: undefined,
      })
    );
    expect(screen.getByLabelText('Situação')).toHaveValue('');
    expect(screen.getByLabelText('Status do irmão')).toHaveValue('');
  });

  it('mostra estado vazio de acordo com os filtros', async () => {
    vi.mocked(creditosMembroApi.listSaldos).mockResolvedValue([]);
    renderPage('/saldos?situacao=DEVEDOR&status=ATIVO');

    expect(await screen.findByText('Nenhum irmão ativo devedor')).toBeInTheDocument();
  });

  it('mostra erro e permite tentar novamente', async () => {
    vi.mocked(creditosMembroApi.listSaldos)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { detail: 'Erro interno.' } },
      })
      .mockResolvedValue([alice]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Erro interno.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('link', { name: 'Alice' })).toBeInTheDocument();
  });

  it('mostra aviso quando não há loja cadastrada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText('Cadastre a loja antes de acompanhar os saldos.')
    ).toBeInTheDocument();
    expect(creditosMembroApi.listSaldos).not.toHaveBeenCalled();
  });
});
