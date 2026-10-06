import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CaixaPage from './CaixaPage';
import { lojaApi } from '../../api/loja';
import { caixaApi } from '../../api/caixa';
import type { Loja } from '../../types/loja';
import type { Caixa } from '../../types/caixa';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/caixa');

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

const caixa: Caixa = {
  loja_id: 1,
  saldo_inicial: '1000.00',
  total_receitas: '350.00',
  total_despesas: '120.50',
  saldo_atual: '1229.50',
};

function renderPage() {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={['/caixa']}>
        <Routes>
          <Route path="/caixa" element={<CaixaPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>
  );
}

describe('CaixaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(caixaApi.get).mockResolvedValue(caixa);
  });

  it('busca o caixa da loja e exibe saldo atual, saldo inicial, receitas e despesas', async () => {
    renderPage();

    const saldo = await screen.findByTestId('saldo-atual');
    expect(caixaApi.get).toHaveBeenCalledWith(1);
    expect(saldo).toHaveTextContent('R$ 1.229,50');
    expect(saldo).toHaveClass('text-emerald-600');
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 350,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 120,50')).toBeInTheDocument();
    expect(screen.queryByText('Saldo negativo')).not.toBeInTheDocument();
  });

  it('destaca saldo atual negativo com cor e rótulo textual', async () => {
    vi.mocked(caixaApi.get).mockResolvedValue({ ...caixa, saldo_atual: '-75.30' });
    renderPage();

    const saldo = await screen.findByTestId('saldo-atual');
    expect(saldo).toHaveTextContent('-R$ 75,30');
    expect(saldo).toHaveClass('text-red-600');
    expect(screen.getByText('Saldo negativo')).toBeInTheDocument();
  });

  it('orienta a definir o saldo inicial quando não há movimentação', async () => {
    vi.mocked(caixaApi.get).mockResolvedValue({
      loja_id: 1,
      saldo_inicial: '0.00',
      total_receitas: '0.00',
      total_despesas: '0.00',
      saldo_atual: '0.00',
    });
    renderPage();

    expect(await screen.findByText(/Nenhuma movimentação registrada/)).toBeInTheDocument();
  });

  it('exibe erro de carregamento e permite tentar novamente', async () => {
    vi.mocked(caixaApi.get)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404, data: { detail: 'Loja nao encontrada.' } },
      })
      .mockResolvedValueOnce(caixa);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Loja nao encontrada.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByTestId('saldo-atual')).toHaveTextContent('R$ 1.229,50');
    expect(caixaApi.get).toHaveBeenCalledTimes(2);
  });

  it('mostra aviso quando não há loja cadastrada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument();
    expect(caixaApi.get).not.toHaveBeenCalled();
  });

  it('define saldo inicial negativo e exibe o caixa recalculado devolvido pelo servidor', async () => {
    vi.mocked(caixaApi.definirSaldoInicial).mockResolvedValue({
      ...caixa,
      saldo_inicial: '-200.75',
      saldo_atual: '28.75',
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Definir saldo inicial' }));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText(/Saldo inicial/);
    expect(input).toHaveValue(1000);

    await user.clear(input);
    await user.type(input, '-200.75');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(caixaApi.definirSaldoInicial).toHaveBeenCalledWith(1, { saldo_inicial: '-200.75' })
    );
    expect(await screen.findByText('Saldo inicial atualizado com sucesso.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('saldo-atual')).toHaveTextContent('R$ 28,75');
    expect(screen.getByText('-R$ 200,75')).toBeInTheDocument();
  });

  it('aceita saldo inicial zero', async () => {
    vi.mocked(caixaApi.definirSaldoInicial).mockResolvedValue({
      ...caixa,
      saldo_inicial: '0.00',
      saldo_atual: '229.50',
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Definir saldo inicial' }));
    const input = screen.getByLabelText(/Saldo inicial/);
    await user.clear(input);
    await user.type(input, '0');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(caixaApi.definirSaldoInicial).toHaveBeenCalledWith(1, { saldo_inicial: '0' })
    );
  });

  it('não envia valor com mais de 2 casas decimais', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Definir saldo inicial' }));
    const input = screen.getByLabelText(/Saldo inicial/);
    await user.clear(input);
    await user.type(input, '10.123');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      screen.getByText('Informe um valor com no máximo 2 casas decimais.')
    ).toBeInTheDocument();
    expect(caixaApi.definirSaldoInicial).not.toHaveBeenCalled();
  });

  it('mantém o diálogo aberto e exibe o erro do servidor quando a gravação falha', async () => {
    vi.mocked(caixaApi.definirSaldoInicial).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: ['body', 'saldo_inicial'],
              msg: 'Decimal input should have no more than 12 digits in total',
            },
          ],
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Definir saldo inicial' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    const dialog = screen.getByRole('dialog');
    expect(
      await within(dialog).findByText(/no more than 12 digits in total/)
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeEnabled();
    expect(screen.getByTestId('saldo-atual')).toHaveTextContent('R$ 1.229,50');
  });
});
