import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CreditosPage from './CreditosPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import { debitosApi } from '../../api/debitos';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import { StoreProvider } from '../../store/StoreProvider';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import type { CobrancaLoja, DebitoMembro, DebitosPorCompetencia } from '../../types/debito';

vi.mock('../../api/loja');
vi.mock('../../api/membros');
vi.mock('../../api/debitos');
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

function membro(id: number, nome: string): Membro {
  return {
    id,
    loja_id: 1,
    nome,
    cim: String(id).padStart(5, '0'),
    telefone: null,
    email: null,
    status: 'ATIVO',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function debito(overrides: Partial<DebitoMembro>): DebitoMembro {
  return {
    id: 1,
    membro_id: 5,
    tipo: 'MENSALIDADE',
    descricao: null,
    valor: '100.00',
    data: '2026-09-05',
    competencia: '2026-09-01',
    observacao: null,
    situacao: 'ABERTO',
    pago_em: null,
    data_pagamento: null,
    forma_pagamento: null,
    debito_recorrente_id: null,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    ...overrides,
  };
}

const cobrancaAlice: CobrancaLoja = {
  membro_id: 5,
  membro_nome: 'Alice Souza',
  competencia: '2026-09-01',
  situacao: 'ABERTO',
  total: '130.10',
  total_em_aberto: '130.10',
  debitos: [
    debito({ id: 11, membro_id: 5, descricao: 'Mensalidade setembro', valor: '100.00' }),
    debito({ id: 12, membro_id: 5, tipo: 'MUTUA', valor: '30.10' }),
  ],
};

const cobrancaBruno: CobrancaLoja = {
  membro_id: 7,
  membro_nome: 'Bruno Lima',
  competencia: '2026-09-01',
  situacao: 'ABERTO',
  total: '0.20',
  total_em_aberto: '0.20',
  debitos: [debito({ id: 21, membro_id: 7, tipo: 'TAXA', valor: '0.20' })],
};

/** Resposta do POST de baixa: mesmo formato, SEM membro_id/membro_nome. */
const alicePaga: DebitosPorCompetencia = {
  competencia: '2026-09-01',
  situacao: 'PAGO',
  total: '130.10',
  total_em_aberto: '0.00',
  debitos: cobrancaAlice.debitos.map((d) => ({
    ...d,
    situacao: 'PAGO' as const,
    data_pagamento: '2026-09-20',
    forma_pagamento: 'PIX' as const,
    pago_em: '2026-09-20T15:00:00Z',
  })),
};

function renderPage() {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={['/creditos']}>
        <Routes>
          <Route path="/creditos" element={<CreditosPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>
  );
}

function cardDe(nome: string): HTMLElement {
  return screen.getByRole('region', { name: new RegExp(nome) });
}

describe('CreditosPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // 2026-10-01T02:30Z = 30/09/2026 22:30 em MS: o mês padrão é setembro (fuso de negócio).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-01T02:30:00Z'));
    vi.mocked(useCanPagarDebito).mockReturnValue(true);
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([
      membro(5, 'Alice Souza'),
      membro(7, 'Bruno Lima'),
    ]);
    vi.mocked(debitosApi.listCobrancas).mockResolvedValue([cobrancaAlice, cobrancaBruno]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre com o mês atual (fuso de MS) e "Em aberto", e soma o total em centavos', async () => {
    renderPage();

    await waitFor(() =>
      expect(debitosApi.listCobrancas).toHaveBeenCalledWith(1, {
        competencia: '2026-09-01',
        situacao: 'ABERTO',
        membro_id: undefined,
      })
    );
    expect(screen.getByLabelText('Competência')).toHaveValue('2026-09');
    expect(screen.getByLabelText('Situação')).toHaveValue('ABERTO');
    expect(screen.getByLabelText('Irmão')).toHaveValue('');

    expect(await screen.findByRole('link', { name: 'Alice Souza' })).toHaveAttribute(
      'href',
      '/membros/5'
    );
    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toHaveAttribute('href', '/membros/7');
    // 130,10 + 0,20 = 130,30 (sem erro de ponto flutuante).
    const totalLinha = screen.getByText(/2 cobrança\(s\)/);
    expect(totalLinha).toHaveTextContent(/2 cobrança\(s\) · Total em aberto R\$\s130,30/);
  });

  it('aplica os filtros ao clicar em "Filtrar" e "Limpar" volta ao padrão', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });

    await user.clear(screen.getByLabelText('Competência'));
    await user.selectOptions(screen.getByLabelText('Situação'), 'Todas');
    await user.selectOptions(screen.getByLabelText('Irmão'), 'Bruno Lima');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() =>
      expect(debitosApi.listCobrancas).toHaveBeenLastCalledWith(1, {
        competencia: undefined,
        situacao: undefined,
        membro_id: 7,
      })
    );

    await user.selectOptions(screen.getByLabelText('Situação'), 'Pagas');
    await user.type(screen.getByLabelText('Competência'), '2026-08');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() =>
      expect(debitosApi.listCobrancas).toHaveBeenLastCalledWith(1, {
        competencia: '2026-08-01',
        situacao: 'PAGO',
        membro_id: 7,
      })
    );

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() =>
      expect(debitosApi.listCobrancas).toHaveBeenLastCalledWith(1, {
        competencia: '2026-09-01',
        situacao: 'ABERTO',
        membro_id: undefined,
      })
    );
    expect(screen.getByLabelText('Competência')).toHaveValue('2026-09');
    expect(screen.getByLabelText('Situação')).toHaveValue('ABERTO');
    expect(screen.getByLabelText('Irmão')).toHaveValue('');
    expect(debitosApi.listCobrancas).toHaveBeenCalledTimes(4);
  });

  it('expande e recolhe os débitos da cobrança, inclusive pelo teclado', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });

    const card = cardDe('Alice Souza');
    const toggle = within(card).getByRole('button', {
      name: 'Débitos da cobrança de Alice Souza de Setembro/2026',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const painel = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(painel).not.toBeNull();
    expect(painel).not.toBeVisible();
    expect(screen.queryByText('Mensalidade — Mensalidade setembro')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(painel).toBeVisible();
    const tabela = within(painel!).getByRole('table');
    expect(within(tabela).getByText('Mensalidade — Mensalidade setembro')).toBeInTheDocument();
    expect(within(tabela).getByText('Mútua')).toBeInTheDocument();
    expect(within(tabela).getAllByText('05/09/2026')).toHaveLength(2);
    // Só a cobrança clicada abre.
    expect(
      within(cardDe('Bruno Lima')).getByRole('button', { name: /Débitos da cobrança de Bruno/ })
    ).toHaveAttribute('aria-expanded', 'false');

    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Mensalidade — Mensalidade setembro')).not.toBeInTheDocument();

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('dá baixa e remove a cobrança paga da lista filtrada por "Em aberto"', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockResolvedValue(alicePaga);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });

    await user.click(
      within(cardDe('Alice Souza')).getByRole('button', { name: /Marcar como paga/ })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() =>
      expect(debitosApi.pagarCobranca).toHaveBeenCalledWith(1, 5, '2026-09-01', {
        data_pagamento: '2026-09-30',
      })
    );
    expect(
      await screen.findByText('Cobrança de Alice Souza de Setembro/2026 marcada como paga.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Alice Souza' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toBeInTheDocument();
    expect(screen.getByText(/1 cobrança\(s\)/)).toHaveTextContent(/Total em aberto R\$\s0,20/);
    // Sem nova consulta.
    expect(debitosApi.listCobrancas).toHaveBeenCalledTimes(1);
  });

  it('com "Todas", substitui a cobrança paga mantendo o nome do irmão', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockResolvedValue(alicePaga);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });

    await user.selectOptions(screen.getByLabelText('Situação'), 'Todas');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(debitosApi.listCobrancas).toHaveBeenCalledTimes(2));
    await screen.findByRole('link', { name: 'Alice Souza' });

    await user.click(
      within(cardDe('Alice Souza')).getByRole('button', { name: /Marcar como paga/ })
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar pagamento' })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const card = cardDe('Alice Souza');
    expect(within(card).getByRole('link', { name: 'Alice Souza' })).toBeInTheDocument();
    expect(within(card).getByText('Pago')).toBeInTheDocument();
    expect(within(card).getByText('Pago em 20/09/2026 · Pix')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /Marcar como paga/ })).not.toBeInTheDocument();
    expect(screen.getByText(/2 cobrança\(s\)/)).toHaveTextContent(/· Total R\$\s130,30/);
  });

  it('mantém o diálogo aberto com a mensagem do 422', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { detail: 'Data de pagamento invalida.' } },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });

    await user.click(
      within(cardDe('Alice Souza')).getByRole('button', { name: /Marcar como paga/ })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(await within(dialog).findByText('Data de pagamento invalida.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alice Souza' })).toBeInTheDocument();
  });

  it('no 404 fecha o diálogo, mostra o erro e recarrega com os filtros aplicados', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Membro nao encontrado.' } },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });
    vi.mocked(debitosApi.listCobrancas).mockResolvedValue([cobrancaBruno]);

    await user.click(
      within(cardDe('Alice Souza')).getByRole('button', { name: /Marcar como paga/ })
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar pagamento' })
    );

    expect(await screen.findByText('Membro nao encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(debitosApi.listCobrancas).toHaveBeenCalledTimes(2));
    expect(debitosApi.listCobrancas).toHaveBeenLastCalledWith(1, {
      competencia: '2026-09-01',
      situacao: 'ABERTO',
      membro_id: undefined,
    });
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Alice Souza' })).not.toBeInTheDocument()
    );
  });

  it('não oferece a baixa sem permissão', async () => {
    vi.mocked(useCanPagarDebito).mockReturnValue(false);
    renderPage();
    await screen.findByRole('link', { name: 'Alice Souza' });

    expect(screen.queryByRole('button', { name: /Marcar como paga/ })).not.toBeInTheDocument();
  });

  it('mostra o estado vazio ligado ao filtro aplicado', async () => {
    vi.mocked(debitosApi.listCobrancas).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText('Nenhuma cobrança em aberto em Setembro/2026')
    ).toBeInTheDocument();
    expect(screen.queryByText(/cobrança\(s\)/)).not.toBeInTheDocument();
  });

  it('mostra erro com opção de tentar novamente', async () => {
    vi.mocked(debitosApi.listCobrancas)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { detail: 'Falha ao listar.' } },
      })
      .mockResolvedValue([cobrancaAlice]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    expect(await screen.findByText('Falha ao listar.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(await screen.findByRole('link', { name: 'Alice Souza' })).toBeInTheDocument();
    expect(debitosApi.listCobrancas).toHaveBeenCalledTimes(2);
  });

  it('sem loja cadastrada, não consulta cobranças', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(lojaApi.list).toHaveBeenCalled());
    expect(await screen.findByText('Cadastre a loja antes de gerenciar créditos.')).toBeInTheDocument();
    expect(debitosApi.listCobrancas).not.toHaveBeenCalled();
  });
});
