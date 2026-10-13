import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SaldosPage from './SaldosPage';
import { lojaApi } from '../../api/loja';
import { creditosMembroApi } from '../../api/creditosMembro';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import { StoreProvider } from '../../store/StoreProvider';
import type { Loja } from '../../types/loja';
import type { MovimentoCredito, SaldoMembro } from '../../types/creditoMembro';

vi.mock('../../api/loja');
vi.mock('../../api/creditosMembro');
vi.mock('../../hooks/usePermissions', () => ({ useCanPagarDebito: vi.fn(() => true) }));

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
    vi.mocked(useCanPagarDebito).mockReturnValue(true);
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

  describe('registrar crédito pela linha', () => {
    const movimento: MovimentoCredito = {
      id: 71,
      membro_id: 5,
      tipo: 'ENTRADA',
      valor: '100.00',
      data: '2026-09-21',
      forma_pagamento: null,
      lancamento_id: 900,
      observacao: null,
      created_at: '2026-09-21T15:00:00Z',
      competencia_quitada: null,
      entrada_origem_id: null,
      competencia_cobranca_vinculada: null,
    };
    const aliceComCredito: SaldoMembro = {
      ...alice,
      total_credito: '130.00',
      saldo: '-50.00',
    };

    async function abrirRegistrarDeAlice(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByRole('link', { name: 'Alice' });
      await user.click(
        within(linhaDe('Alice')).getByRole('button', { name: 'Registrar crédito para Alice' })
      );
      return screen.findByRole('dialog');
    }

    it('abre o diálogo de registro do irmão da linha', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await abrirRegistrarDeAlice(user);

      expect(within(dialog).getByText('Valor adiantado por Alice.')).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/Categoria da receita/)).toHaveValue('Mensalidade');
      expect(creditosMembroApi.registrar).not.toHaveBeenCalled();
    });

    it('registra para o irmão certo, fecha, avisa e recarrega a linha e os totais', async () => {
      vi.mocked(creditosMembroApi.registrar).mockResolvedValue(movimento);
      const user = userEvent.setup();
      renderPage('/saldos?situacao=DEVEDOR');
      const dialog = await abrirRegistrarDeAlice(user);
      vi.mocked(creditosMembroApi.listSaldos).mockResolvedValue([aliceComCredito, bruno]);

      await user.type(within(dialog).getByLabelText(/Valor/), '100');
      await user.click(within(dialog).getByRole('button', { name: 'Registrar crédito' }));

      await waitFor(() =>
        expect(creditosMembroApi.registrar).toHaveBeenCalledWith(
          1,
          5,
          expect.objectContaining({ valor: '100', categoria: 'Mensalidade' })
        )
      );
      expect(
        await screen.findByText('Crédito de R$ 100,00 registrado para Alice.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // Recarrega com os filtros aplicados.
      await waitFor(() => expect(creditosMembroApi.listSaldos).toHaveBeenCalledTimes(2));
      expect(creditosMembroApi.listSaldos).toHaveBeenLastCalledWith(1, {
        situacao: 'DEVEDOR',
        status: undefined,
      });
      await waitFor(() =>
        expect(within(linhaDe('Alice')).getByText('R$ 130,00')).toBeInTheDocument()
      );
      expect(screen.getByText(/2 irmão\(s\)/)).toHaveTextContent(/Crédito R\$\s175,50/);
    });

    it('irmão inativo: botão desabilitado com o motivo', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('link', { name: 'Bruno' });

      const botao = within(linhaDe('Bruno')).getByRole('button', {
        name: 'Registrar crédito para Bruno',
      });
      expect(botao).toBeDisabled();
      expect(botao).toHaveAccessibleDescription('Irmão inativo não recebe crédito novo.');
      await user.click(botao);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        within(linhaDe('Alice')).getByRole('button', { name: 'Registrar crédito para Alice' })
      ).toBeEnabled();
    });

    it('sem permissão, não oferece a ação', async () => {
      vi.mocked(useCanPagarDebito).mockReturnValue(false);
      renderPage();
      await screen.findByRole('link', { name: 'Alice' });

      expect(screen.queryByRole('button', { name: /Registrar crédito/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument();
    });

    it('erro do servidor (500) fica no diálogo, que continua aberto, sem recarregar', async () => {
      vi.mocked(creditosMembroApi.registrar).mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, data: { detail: 'Erro ao registrar credito.' } },
      });
      const user = userEvent.setup();
      renderPage();
      const dialog = await abrirRegistrarDeAlice(user);

      await user.type(within(dialog).getByLabelText(/Valor/), '100');
      await user.click(within(dialog).getByRole('button', { name: 'Registrar crédito' }));

      expect(await within(dialog).findByText('Erro ao registrar credito.')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(creditosMembroApi.listSaldos).toHaveBeenCalledTimes(1);
    });

    it('409 (irmão inativado em outra tela) fecha o diálogo, mostra a mensagem e recarrega', async () => {
      vi.mocked(creditosMembroApi.registrar).mockRejectedValue({
        isAxiosError: true,
        response: { status: 409, data: { detail: 'Membro inativo nao recebe credito.' } },
      });
      const user = userEvent.setup();
      renderPage();
      const dialog = await abrirRegistrarDeAlice(user);

      await user.type(within(dialog).getByLabelText(/Valor/), '100');
      await user.click(within(dialog).getByRole('button', { name: 'Registrar crédito' }));

      expect(await screen.findByText('Membro inativo nao recebe credito.')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(creditosMembroApi.listSaldos).toHaveBeenCalledTimes(2));
    });
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
