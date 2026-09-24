import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DebitosListPage from './DebitosListPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import { debitosApi } from '../../api/debitos';
import { debitosRecorrentesApi } from '../../api/debitosRecorrentes';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import type { DebitoMembro, DebitoRecorrente } from '../../types/debito';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/membros');
vi.mock('../../api/debitos');
vi.mock('../../api/debitosRecorrentes');

function recorrente(overrides: Partial<DebitoRecorrente>): DebitoRecorrente {
  return {
    id: 1,
    loja_id: 1,
    tipo: 'MENSALIDADE',
    descricao: 'Mensalidade',
    valor: '100.00',
    ativo: true,
    ordem: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

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

const membro: Membro = {
  id: 5,
  loja_id: 1,
  nome: 'Membro Filtrado',
  cim: '00001',
  telefone: null,
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const debito: DebitoMembro = {
  id: 20,
  membro_id: 5,
  tipo: 'MENSALIDADE',
  descricao: 'Mensalidade agosto',
  valor: '100.00',
  data: '2026-08-05',
  competencia: '2026-08-01',
  observacao: null,
  situacao: 'ABERTO',
  pago_em: null,
  data_pagamento: null,
  forma_pagamento: null,
  debito_recorrente_id: null,
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

function renderPage(state?: unknown) {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={[{ pathname: '/debitos', state }]}>
      <Routes>
        <Route path="/debitos" element={<DebitosListPage />} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

describe('DebitosListPage — filtros', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carrega a lista inicial sem filtros e depois reconsulta com os filtros aplicados', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(debitosApi.listByLoja).toHaveBeenCalledWith(1, {
        competencia: undefined,
        membro_id: undefined,
        tipo: undefined,
      })
    );
    await waitFor(() => expect(screen.getByText('Mensalidade agosto')).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('Membro'), '5');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'MENSALIDADE');
    await user.type(screen.getByLabelText('Competência'), '2026-08');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() =>
      expect(debitosApi.listByLoja).toHaveBeenLastCalledWith(1, {
        competencia: '2026-08-01',
        membro_id: 5,
        tipo: 'MENSALIDADE',
      })
    );
  });
});

describe('DebitosListPage — gerar mensalidades', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito]);
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([
      recorrente({ id: 1, descricao: 'Mensalidade', valor: '100.00' }),
      recorrente({ id: 2, tipo: 'COTIZACAO', descricao: 'Cotização', valor: '30.50', ordem: 1 }),
      recorrente({ id: 3, tipo: 'TAXA', descricao: 'Taxa antiga', valor: '9.99', ativo: false }),
    ]);
  });

  async function abrirModal(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => expect(screen.getByText('Mensalidade agosto')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Competência'), '2026-08');
    await user.click(screen.getByRole('button', { name: 'Gerar mensalidades' }));
    return screen.findByRole('dialog');
  }

  it('mostra no modal a prévia dos itens recorrentes ativos e o total por irmão', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await abrirModal(user);

    expect(await within(dialog).findByText('Cotização')).toBeInTheDocument();
    expect(within(dialog).getByText('Mensalidade')).toBeInTheDocument();
    expect(within(dialog).queryByText('Taxa antiga')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Total por irmão').parentElement).toHaveTextContent('R$ 130,50');
    expect(debitosRecorrentesApi.list).toHaveBeenCalledWith(1);
  });

  it('prévia vazia informa que não há itens ativos (sem link)', async () => {
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([recorrente({ ativo: false })]);
    const user = userEvent.setup();
    renderPage();
    const dialog = await abrirModal(user);

    expect(
      await within(dialog).findByText('Nenhum débito recorrente ativo cadastrado.')
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
  });

  it('mostra só a contagem quando há mais de 10 irmãos já cobrados', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockResolvedValue({
      debitos_criados: [],
      membros_ja_cobrados: Array.from({ length: 11 }, (_, i) => ({
        membro_id: 100 + i,
        nome: `Irmão ${i}`,
      })),
    });
    const user = userEvent.setup();
    renderPage();
    const dialog = await abrirModal(user);
    await user.click(within(dialog).getByRole('button', { name: 'Gerar mensalidades' }));

    expect(
      await screen.findByText(/11 irmão\(s\) já estavam cobrados nesta competência\./)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Irmão 0/)).not.toBeInTheDocument();
  });

  it('422 de competência inválida (sem header) não mostra o link para a Loja', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        headers: {},
        data: { detail: [{ loc: ['query', 'competencia'], msg: 'competencia deve ser o dia 1' }] },
      },
    });
    const user = userEvent.setup();
    renderPage();
    const dialog = await abrirModal(user);
    await user.click(within(dialog).getByRole('button', { name: 'Gerar mensalidades' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'competencia: competencia deve ser o dia 1'
    );
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
  });

  it('usa a competência selecionada no filtro, mostra o resultado e recarrega a lista', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockResolvedValue({
      debitos_criados: [debito],
      membros_ja_cobrados: [{ membro_id: 9, nome: 'Outro Membro' }],
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Mensalidade agosto')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Competência'), '2026-08');
    await user.click(screen.getByRole('button', { name: 'Gerar mensalidades' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar mensalidades' }));

    await waitFor(() =>
      expect(debitosApi.gerarMensalidades).toHaveBeenCalledWith(1, '2026-08-01')
    );
    await waitFor(() =>
      expect(screen.getByText(/1 débito\(s\) criado\(s\)/)).toBeInTheDocument()
    );
    expect(
      screen.getByText(/1 irmão\(s\) já estavam cobrados nesta competência: Outro Membro\./)
    ).toBeInTheDocument();

    // recarrega a lista de débitos após o sucesso
    expect(debitosApi.listByLoja).toHaveBeenCalledTimes(2);
  });

  it('oculta "Editar" (e explica com "Cobrança paga") para débitos de cobrança já paga', async () => {
    const pago: DebitoMembro = {
      ...debito,
      id: 21,
      descricao: 'Mensalidade julho',
      situacao: 'PAGO',
      pago_em: '2026-07-20T15:00:00+00:00',
      data_pagamento: '2026-07-20',
      forma_pagamento: 'PIX',
    };
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito, pago]);
    renderPage();

    const linhaAberto = (await screen.findByText('Mensalidade agosto')).closest('tr')!;
    const linhaPago = screen.getByText('Mensalidade julho').closest('tr')!;

    // A situação pertence à cobrança do mês: sem coluna/badge por débito.
    expect(screen.queryByRole('columnheader', { name: 'Situação' })).not.toBeInTheDocument();
    expect(within(linhaAberto).queryByText('Cobrança paga')).not.toBeInTheDocument();
    expect(within(linhaAberto).getByRole('link', { name: /Editar/ })).toHaveAttribute(
      'href',
      '/debitos/20/editar'
    );

    expect(within(linhaPago).getByText('Cobrança paga')).toBeInTheDocument();
    expect(within(linhaPago).getByRole('link', { name: /Ver/ })).toBeInTheDocument();
    expect(within(linhaPago).queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
  });

  it('usa o mês atual como padrão quando nenhuma competência está selecionada no filtro', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockResolvedValue({
      debitos_criados: [],
      membros_ja_cobrados: [],
    });

    // Instante de fronteira: 2026-09-01T02:30Z é 31/08/2026 22:30 em MS (UTC-4).
    // O app deve usar o mês de MS ("2026-08"), e não o de UTC ("2026-09"),
    // independentemente do fuso do ambiente que roda os testes.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-01T02:30:00Z'));

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Mensalidade agosto')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Gerar mensalidades' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar mensalidades' }));

    await waitFor(() =>
      expect(debitosApi.gerarMensalidades).toHaveBeenCalledWith(1, '2026-08-01')
    );
  });

  it('mostra mensagem com link para a Loja no 422 SEM_DEBITO_RECORRENTE_ATIVO', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        headers: { 'x-error-code': 'SEM_DEBITO_RECORRENTE_ATIVO' },
        data: { detail: 'Configure o valor da mensalidade da loja antes de gerar cobranças.' },
      },
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Mensalidade agosto')).toBeInTheDocument());
    await user.type(screen.getByLabelText('Competência'), '2026-08');
    await user.click(screen.getByRole('button', { name: 'Gerar mensalidades' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar mensalidades' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Configure o valor da mensalidade da loja antes de gerar cobranças\./)
      ).toBeInTheDocument()
    );
    expect(
      screen.getByRole('link', { name: 'Configure os débitos recorrentes na Loja' })
    ).toHaveAttribute('href', '/loja#debitos-recorrentes');
  });
});

describe('DebitosListPage — resultado do lançamento em massa', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito]);
  });

  it('exibe criados e ignorados com o motivo traduzido', async () => {
    renderPage({
      resultadoEmMassa: {
        criados: 3,
        ignorados: [
          { membro_id: 7, nome: 'Irmão Pago', motivo: 'COMPETENCIA_PAGA' },
          { membro_id: 8, nome: 'Irmão Repetido', motivo: 'DEBITO_JA_EXISTENTE' },
        ],
      },
    });

    const alerta = await screen.findByText(/3 débito\(s\) criado\(s\)\./);
    const container = alerta.closest('[role="status"]')!;
    expect(container).toHaveTextContent('2 irmão(s) ignorado(s)');
    expect(within(container as HTMLElement).getByText('Irmão Pago (competência já paga)')).toBeInTheDocument();
    expect(
      within(container as HTMLElement).getByText('Irmão Repetido (já possui este débito na competência)')
    ).toBeInTheDocument();
  });

  it('informa quando não há irmão ativo', async () => {
    renderPage({ resultadoEmMassa: { criados: 0, ignorados: [] } });

    expect(await screen.findByText('Nenhum irmão ativo, nenhum débito criado.')).toBeInTheDocument();
  });
});
