import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MembroDetailPage from './MembroDetailPage';
import { membrosApi } from '../../api/membros';
import { debitosApi } from '../../api/debitos';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import type { Membro } from '../../types/membro';
import type { DebitoMembro, DebitosPorCompetencia } from '../../types/debito';

vi.mock('../../api/membros');
vi.mock('../../api/debitos');
vi.mock('../../hooks/usePermissions', () => ({ useCanPagarDebito: vi.fn(() => true) }));

const membro: Membro = {
  id: 5,
  loja_id: 1,
  nome: 'Membro Teste',
  cim: '00001',
  telefone: null,
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function debitoBase(overrides: Partial<DebitoMembro>): DebitoMembro {
  return {
    id: 1,
    membro_id: 5,
    tipo: 'MENSALIDADE',
    descricao: null,
    valor: '150.00',
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

const debitoMensalidade = debitoBase({ id: 11, descricao: 'Mensalidade setembro', valor: '150.00' });
const debitoMutua = debitoBase({ id: 13, tipo: 'MUTUA', descricao: null, valor: '30.00' });
const debitoAgostoPago = debitoBase({
  id: 12,
  valor: '100.00',
  data: '2026-08-05',
  competencia: '2026-08-01',
  descricao: 'Mensalidade agosto',
  situacao: 'PAGO',
  pago_em: '2026-08-20T15:00:00+00:00',
  data_pagamento: '2026-08-20',
  forma_pagamento: 'PIX',
});

const cobrancaSetembro: DebitosPorCompetencia = {
  competencia: '2026-09-01',
  situacao: 'ABERTO',
  total: '180.00',
  total_em_aberto: '180.00',
  debitos: [debitoMensalidade, debitoMutua],
};
const cobrancaAgosto: DebitosPorCompetencia = {
  competencia: '2026-08-01',
  situacao: 'PAGO',
  total: '100.00',
  total_em_aberto: '0.00',
  debitos: [debitoAgostoPago],
};
const cobrancas: DebitosPorCompetencia[] = [cobrancaSetembro, cobrancaAgosto];

/** Resposta do servidor após pagar setembro (mesmo formato do item da lista). */
const cobrancaSetembroPaga: DebitosPorCompetencia = {
  competencia: '2026-09-01',
  situacao: 'PAGO',
  total: '180.00',
  total_em_aberto: '0.00',
  debitos: [debitoMensalidade, debitoMutua].map((d) => ({
    ...d,
    situacao: 'PAGO' as const,
    pago_em: '2026-09-21T15:00:00+00:00',
    data_pagamento: '2026-09-21',
    forma_pagamento: 'PIX' as const,
  })),
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/membros/5']}>
      <Routes>
        <Route path="/membros/:id" element={<MembroDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MembroDetailPage — cobranças por competência', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useCanPagarDebito).mockReturnValue(true);
    vi.mocked(membrosApi.get).mockResolvedValue(membro);
    vi.mocked(debitosApi.listPorCompetencia).mockResolvedValue(cobrancas);
  });

  it('consulta pela loja e pelo id do membro e mostra uma cobrança por mês, na ordem recebida', async () => {
    renderPage();

    const setembro = await screen.findByRole('region', { name: 'Cobrança de Setembro/2026' });
    expect(debitosApi.listPorCompetencia).toHaveBeenCalledWith(1, 5);

    const ids = screen
      .getAllByRole('region')
      .map((r) => r.getAttribute('aria-labelledby'))
      .filter(Boolean);
    expect(ids).toEqual(['cobranca-2026-09-01', 'cobranca-2026-08-01']);

    // Situação e total da cobrança vêm do servidor.
    expect(within(setembro).getByText('Em aberto')).toBeInTheDocument();
    expect(within(setembro).getByText(/^Total/)).toHaveTextContent('Total R$ 180,00');
    const agosto = screen.getByRole('region', { name: 'Cobrança de Agosto/2026' });
    expect(within(agosto).getByText(/^Total/)).toHaveTextContent('Total R$ 100,00');
  });

  it('lista os débitos da cobrança como composição do total, sem situação nem ação por débito', async () => {
    renderPage();

    const setembro = await screen.findByRole('region', { name: 'Cobrança de Setembro/2026' });
    expect(within(setembro).getByText('Mensalidade — Mensalidade setembro')).toBeInTheDocument();
    expect(within(setembro).getByText('Mútua')).toBeInTheDocument();
    expect(within(setembro).getByText('R$ 150,00')).toBeInTheDocument();
    expect(within(setembro).getByText('R$ 30,00')).toBeInTheDocument();

    // A situação é da cobrança: nenhuma coluna "Situação" por débito.
    expect(within(setembro).queryByRole('columnheader', { name: 'Situação' })).not.toBeInTheDocument();
    // Um único botão de pagamento por cobrança (nunca por débito).
    expect(within(setembro).getAllByRole('button')).toHaveLength(1);
    expect(
      within(setembro).getByRole('button', { name: 'Marcar cobrança como paga' })
    ).toBeInTheDocument();
  });

  it('cobrança paga mostra a data e a forma do pagamento e nenhuma ação', async () => {
    renderPage();

    const agosto = await screen.findByRole('region', { name: 'Cobrança de Agosto/2026' });
    expect(within(agosto).getByText('Pago')).toBeInTheDocument();
    expect(within(agosto).getByText('Pago em 20/08/2026 · Pix')).toBeInTheDocument();
    expect(within(agosto).queryByRole('button')).not.toBeInTheDocument();
  });

  it('trata de forma defensiva uma cobrança PARCIAL (dados legados)', async () => {
    vi.mocked(debitosApi.listPorCompetencia).mockResolvedValue([
      {
        competencia: '2026-07-01',
        situacao: 'PARCIAL',
        total: '150.00',
        total_em_aberto: '50.00',
        debitos: [
          debitoBase({
            id: 31,
            competencia: '2026-07-01',
            valor: '100.00',
            situacao: 'PAGO',
            pago_em: '2026-07-10T15:00:00+00:00',
            data_pagamento: '2026-07-10',
          }),
          debitoBase({ id: 32, competencia: '2026-07-01', tipo: 'TAXA', valor: '50.00' }),
        ],
      },
    ]);
    renderPage();

    const julho = await screen.findByRole('region', { name: 'Cobrança de Julho/2026' });
    expect(within(julho).getByText('Parcial')).toBeInTheDocument();
    expect(within(julho).getByText(/^Total/)).toHaveTextContent('Total R$ 150,00 · Em aberto R$ 50,00');
    // O servidor paga o que estiver em aberto: a ação continua disponível.
    expect(
      within(julho).getByRole('button', { name: 'Marcar cobrança como paga' })
    ).toBeInTheDocument();
  });

  it('mostra estado vazio quando o membro não tem cobranças', async () => {
    vi.mocked(debitosApi.listPorCompetencia).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Nenhuma cobrança para este irmão')).toBeInTheDocument();
  });

  it('mostra erro na seção sem derrubar os dados do membro e permite tentar novamente', async () => {
    vi.mocked(debitosApi.listPorCompetencia)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { detail: 'Erro interno.' } },
      })
      .mockResolvedValue(cobrancas);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Erro interno.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Membro Teste' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('region', { name: 'Cobrança de Setembro/2026' })).toBeInTheDocument();
    expect(debitosApi.listPorCompetencia).toHaveBeenCalledTimes(2);
  });
});

describe('MembroDetailPage — marcar cobrança como paga', () => {
  // 2026-09-21T15:00Z = 21/09/2026 11:00 em MS.
  const AGORA = new Date('2026-09-21T15:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(AGORA);
    vi.resetAllMocks();
    vi.mocked(useCanPagarDebito).mockReturnValue(true);
    vi.mocked(membrosApi.get).mockResolvedValue(membro);
    vi.mocked(debitosApi.listPorCompetencia).mockResolvedValue(cobrancas);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function abrirDialogoDeSetembro(user: ReturnType<typeof userEvent.setup>) {
    const setembro = await screen.findByRole('region', { name: 'Cobrança de Setembro/2026' });
    await user.click(within(setembro).getByRole('button', { name: 'Marcar cobrança como paga' }));
    return screen.findByRole('dialog');
  }

  it('oferece a ação só para cobranças não pagas', async () => {
    renderPage();

    await screen.findByRole('region', { name: 'Cobrança de Setembro/2026' });
    expect(screen.getAllByRole('button', { name: 'Marcar cobrança como paga' })).toHaveLength(1);
  });

  it('oferece a ação também para membro INATIVO', async () => {
    vi.mocked(membrosApi.get).mockResolvedValue({ ...membro, status: 'INATIVO' });
    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Marcar cobrança como paga' })
    ).toBeInTheDocument();
  });

  it('não oferece a ação quando a permissão (useCanPagarDebito) é negada', async () => {
    vi.mocked(useCanPagarDebito).mockReturnValue(false);
    renderPage();

    await screen.findByRole('region', { name: 'Cobrança de Setembro/2026' });
    expect(screen.queryByRole('button', { name: 'Marcar cobrança como paga' })).not.toBeInTheDocument();
  });

  it('abre o diálogo com o resumo, data padrão de hoje (MS), sem data futura, e forma opcional', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    expect(within(dialog).getByText('Marcar cobrança como paga')).toBeInTheDocument();
    expect(within(dialog).getByText('Cobrança de Setembro/2026 · Total R$ 180,00')).toBeInTheDocument();

    const data = within(dialog).getByLabelText('Data do pagamento');
    expect(data).toHaveValue('2026-09-21');
    expect(data).toHaveAttribute('max', '2026-09-21');

    const forma = within(dialog).getByLabelText('Forma de pagamento');
    expect(forma).toHaveValue('');
    const opcoes = within(forma).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Não informar', 'Dinheiro', 'Pix', 'Transferência', 'Depósito', 'Outro']);

    // Botão de confirmar é primário (não destrutivo).
    expect(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }).className).toContain(
      'bg-blue-600'
    );
  });

  it('usa o dia de MS (e não o de UTC) como data padrão na virada do dia', async () => {
    // 2026-09-21T02:30Z = 20/09/2026 22:30 em MS.
    vi.setSystemTime(new Date('2026-09-21T02:30:00Z'));
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    expect(within(dialog).getByLabelText('Data do pagamento')).toHaveValue('2026-09-20');
  });

  it('cancelar fecha o diálogo sem pagar', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(debitosApi.pagarCobranca).not.toHaveBeenCalled();
  });

  it('confirma com data e forma informadas, envia só as chaves preenchidas e atualiza a partir da resposta', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockResolvedValue(cobrancaSetembroPaga);
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    fireEvent.change(within(dialog).getByLabelText('Data do pagamento'), {
      target: { value: '2026-09-20' },
    });
    await user.selectOptions(within(dialog).getByLabelText('Forma de pagamento'), 'PIX');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() =>
      expect(debitosApi.pagarCobranca).toHaveBeenCalledWith(1, 5, '2026-09-01', {
        data_pagamento: '2026-09-20',
        forma_pagamento: 'PIX',
      })
    );
    expect(debitosApi.pagarCobranca).toHaveBeenCalledTimes(1);

    expect(await screen.findByText('Cobrança de Setembro/2026 marcada como paga.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // A resposta substitui a cobrança: sem nova consulta e sem ação restante.
    expect(debitosApi.listPorCompetencia).toHaveBeenCalledTimes(1);
    const setembro = screen.getByRole('region', { name: 'Cobrança de Setembro/2026' });
    expect(within(setembro).getByText('Pago')).toBeInTheDocument();
    expect(within(setembro).getByText('Pago em 21/09/2026 · Pix')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar cobrança como paga' })).not.toBeInTheDocument();
    // A outra cobrança permanece intacta.
    expect(screen.getByRole('region', { name: 'Cobrança de Agosto/2026' })).toBeInTheDocument();
  });

  it('omite a forma (não envia null) quando "Não informar" e envia a data padrão', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockResolvedValue(cobrancaSetembroPaga);
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() => expect(debitosApi.pagarCobranca).toHaveBeenCalledTimes(1));
    const input = vi.mocked(debitosApi.pagarCobranca).mock.calls[0][3]!;
    expect(input).toEqual({ data_pagamento: '2026-09-21' });
    expect('forma_pagamento' in input).toBe(false);
  });

  it('omite a data quando o campo é limpo (o servidor usa hoje)', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockResolvedValue(cobrancaSetembroPaga);
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    fireEvent.change(within(dialog).getByLabelText('Data do pagamento'), { target: { value: '' } });
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    await waitFor(() => expect(debitosApi.pagarCobranca).toHaveBeenCalledTimes(1));
    const input = vi.mocked(debitosApi.pagarCobranca).mock.calls[0][3]!;
    expect(Object.keys(input)).toEqual([]);
  });

  it('bloqueia data futura no cliente, sem chamar a API', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    fireEvent.change(within(dialog).getByLabelText('Data do pagamento'), {
      target: { value: '2026-09-22' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(within(dialog).getByText('A data do pagamento não pode ser futura.')).toBeInTheDocument();
    expect(debitosApi.pagarCobranca).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('impede duplo envio e fechamento por ESC/Cancelar enquanto o pagamento está sendo registrado', async () => {
    let resolver: (c: DebitosPorCompetencia) => void = () => {};
    vi.mocked(debitosApi.pagarCobranca).mockReturnValue(
      new Promise<DebitosPorCompetencia>((resolve) => {
        resolver = resolve;
      })
    );
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    const registrando = await within(dialog).findByRole('button', { name: 'Registrando...' });
    expect(registrando).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await user.click(registrando);
    expect(debitosApi.pagarCobranca).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    resolver(cobrancaSetembroPaga);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('mantém o diálogo aberto e mostra o erro do servidor (500), permitindo nova tentativa', async () => {
    vi.mocked(debitosApi.pagarCobranca)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500, data: { detail: 'Erro ao registrar o pagamento da cobranca.' } },
      })
      .mockResolvedValue(cobrancaSetembroPaga);
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(
      await within(dialog).findByText('Erro ao registrar o pagamento da cobranca.')
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));
    await waitFor(() => expect(debitosApi.pagarCobranca).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('mostra mensagem amigável quando não há conexão com o servidor', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockRejectedValue({ isAxiosError: true, response: undefined });
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(
      await within(dialog).findByText(/Não foi possível conectar ao servidor/)
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('mostra o 422 do servidor dentro do diálogo, mantendo-o aberto', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { detail: 'Data de pagamento invalida.' } },
    });
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(await within(dialog).findByText('Data de pagamento invalida.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha o diálogo, avisa e recarrega a lista quando a cobrança não existe mais (404)', async () => {
    vi.mocked(debitosApi.pagarCobranca).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Cobranca nao encontrada.' } },
    });
    const user = userEvent.setup();
    renderPage();

    const dialog = await abrirDialogoDeSetembro(user);
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));

    expect(await screen.findByText('Cobranca nao encontrada.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(debitosApi.listPorCompetencia).toHaveBeenCalledTimes(2));
  });
});
