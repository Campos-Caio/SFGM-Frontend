import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import DebitoFormPage from './DebitoFormPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import { debitosApi } from '../../api/debitos';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import type { DebitoMembro } from '../../types/debito';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/membros');
vi.mock('../../api/debitos');

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
  nome: 'Membro Teste',
  cim: '00001',
  telefone: null,
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const debitoAberto: DebitoMembro = {
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

const debitoPago: DebitoMembro = {
  ...debitoAberto,
  situacao: 'PAGO',
  pago_em: '2026-08-20T15:00:00+00:00',
  data_pagamento: '2026-08-20',
  forma_pagamento: 'PIX',
};

function renderEdit() {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={['/debitos/20/editar']}>
      <Routes>
        <Route path="/debitos/:id/editar" element={<DebitoFormPage />} />
        <Route path="/debitos/:id" element={<p>Detalhe do débito</p>} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

describe('DebitoFormPage — edição de débito pago', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
  });

  it('débito em aberto pode ser salvo normalmente', async () => {
    vi.mocked(debitosApi.get).mockResolvedValue(debitoAberto);
    vi.mocked(debitosApi.update).mockResolvedValue(debitoAberto);
    const user = userEvent.setup();
    renderEdit();

    const salvar = await screen.findByRole('button', { name: 'Salvar' });
    expect(salvar).toBeEnabled();
    expect(screen.queryByText(/cobrança já paga/)).not.toBeInTheDocument();

    await user.click(salvar);
    await waitFor(() => expect(debitosApi.update).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Detalhe do débito')).toBeInTheDocument();
  });

  it('débito pago mostra aviso e desabilita o botão de salvar', async () => {
    vi.mocked(debitosApi.get).mockResolvedValue(debitoPago);
    renderEdit();

    expect(
      await screen.findByText('Este débito pertence a uma cobrança já paga e não pode ser alterado.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(debitosApi.update).not.toHaveBeenCalled();
  });

  it('exibe a mensagem do backend quando o salvamento é recusado com 409', async () => {
    vi.mocked(debitosApi.get).mockResolvedValue(debitoAberto);
    vi.mocked(debitosApi.update).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { detail: 'Nao e possivel alterar ou excluir um debito ja pago.' },
      },
    });
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText(/Nao e possivel alterar ou excluir um debito ja pago\./)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
});

describe('DebitoFormPage — competência já paga (409)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
  });

  it('mostra a mensagem do servidor ao lançar um débito em competência já paga', async () => {
    const detail =
      'Nao e possivel lancar debito em uma competencia ja paga. Lance o debito em outra competencia.';
    vi.mocked(debitosApi.create).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail } },
    });
    const user = userEvent.setup();
    render(
      <StoreProvider>
      <MemoryRouter initialEntries={['/debitos/novo']}>
        <Routes>
          <Route path="/debitos/novo" element={<DebitoFormPage />} />
        </Routes>
      </MemoryRouter>
      </StoreProvider>
    );

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.selectOptions(screen.getByLabelText(/^Membro/), '5');
    await user.selectOptions(screen.getByLabelText(/^Tipo/), 'MENSALIDADE');
    await user.type(screen.getByLabelText(/^Valor/), '100');
    fireEvent.change(screen.getByLabelText(/^Data/), { target: { value: '2026-09-05' } });
    fireEvent.change(screen.getByLabelText(/^Competência/), { target: { value: '2026-09' } });
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(`Não foi possível salvar o débito. ${detail}`);
    expect(debitosApi.create).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem do servidor ao mover um débito para uma competência já paga', async () => {
    const detail = 'Nao e possivel alterar ou excluir um debito ja pago.';
    vi.mocked(debitosApi.get).mockResolvedValue(debitoAberto);
    vi.mocked(debitosApi.update).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail } },
    });
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(detail);
  });
});

describe('DebitoFormPage — lançamento em massa', () => {
  const membroInativo: Membro = { ...membro, id: 6, nome: 'Membro Inativo', status: 'INATIVO' };
  const outroAtivo: Membro = { ...membro, id: 7, nome: 'Outro Ativo' };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro, membroInativo, outroAtivo]);
  });

  function renderNovo() {
    return render(
      <StoreProvider>
      <MemoryRouter initialEntries={['/debitos/novo']}>
        <Routes>
          <Route path="/debitos/novo" element={<DebitoFormPage />} />
          <Route path="/debitos" element={<ListaStub />} />
        </Routes>
      </MemoryRouter>
      </StoreProvider>
    );
  }

  async function preencherComum(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText(/^Tipo/), 'OUTRO');
    await user.type(screen.getByLabelText(/^Descrição/), 'Rifa');
    await user.type(screen.getByLabelText(/^Valor/), '25');
    fireEvent.change(screen.getByLabelText(/^Data/), { target: { value: '2026-09-05' } });
    fireEvent.change(screen.getByLabelText(/^Competência/), { target: { value: '2026-09' } });
  }

  it('oculta o membro, confirma com valor e nº de irmãos ativos e navega com o resultado', async () => {
    vi.mocked(debitosApi.lancarEmMassa).mockResolvedValue({
      debitos_criados: [debitoAberto],
      membros_ignorados: [{ membro_id: 7, nome: 'Outro Ativo', motivo: 'DEBITO_JA_EXISTENTE' }],
    });
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));
    expect(screen.queryByLabelText(/^Membro/)).not.toBeInTheDocument();

    await preencherComum(user);
    await user.click(screen.getByRole('button', { name: 'Lançar para todos' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('R$ 25,00');
    expect(dialog).toHaveTextContent('09/2026');
    expect(dialog).toHaveTextContent('2 irmão(s) ativo(s)');
    expect(debitosApi.lancarEmMassa).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Lançar para todos' }));

    await waitFor(() =>
      expect(debitosApi.lancarEmMassa).toHaveBeenCalledWith(1, {
        tipo: 'OUTRO',
        descricao: 'Rifa',
        valor: '25',
        data: '2026-09-05',
        competencia: '2026-09-01',
        observacao: null,
      })
    );
    expect(debitosApi.create).not.toHaveBeenCalled();
    expect(await screen.findByTestId('lista-state')).toHaveTextContent(
      JSON.stringify({
        resultadoEmMassa: {
          criados: 1,
          ignorados: [{ membro_id: 7, nome: 'Outro Ativo', motivo: 'DEBITO_JA_EXISTENTE' }],
        },
      })
    );
  });

  it('cancelar a confirmação não envia nada', async () => {
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));
    await preencherComum(user);
    await user.click(screen.getByRole('button', { name: 'Lançar para todos' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(debitosApi.lancarEmMassa).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor e permanece no formulário quando o lançamento falha', async () => {
    vi.mocked(debitosApi.lancarEmMassa).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Loja nao encontrada.' } },
    });
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));
    await preencherComum(user);
    await user.click(screen.getByRole('button', { name: 'Lançar para todos' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Lançar para todos' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Loja nao encontrada.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lançar para todos' })).toBeEnabled();
  });

  it('desmarcar volta ao fluxo individual (membro obrigatório, cria via create)', async () => {
    vi.mocked(debitosApi.create).mockResolvedValue(debitoAberto);
    const user = userEvent.setup();
    render(
      <StoreProvider>
      <MemoryRouter initialEntries={['/debitos/novo']}>
        <Routes>
          <Route path="/debitos/novo" element={<DebitoFormPage />} />
          <Route path="/debitos/:id" element={<p>Detalhe do débito</p>} />
        </Routes>
      </MemoryRouter>
      </StoreProvider>
    );

    await screen.findByRole('option', { name: 'Membro Teste' });
    const checkbox = screen.getByLabelText('Aplicar a todos os irmãos ativos');
    await user.click(checkbox);
    await user.click(checkbox);
    await user.selectOptions(screen.getByLabelText(/^Membro/), '5');
    await preencherComum(user);
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(debitosApi.create).toHaveBeenCalledWith(5, expect.any(Object)));
    expect(debitosApi.lancarEmMassa).not.toHaveBeenCalled();
    expect(await screen.findByText('Detalhe do débito')).toBeInTheDocument();
  });

  async function preencherSemDescricao(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText(/^Tipo/), 'OUTRO');
    await user.type(screen.getByLabelText(/^Valor/), '25');
    fireEvent.change(screen.getByLabelText(/^Data/), { target: { value: '2026-09-05' } });
    fireEvent.change(screen.getByLabelText(/^Competência/), { target: { value: '2026-09' } });
  }

  it('em massa, a descrição é obrigatória e o cabeçalho fala em todos os irmãos', async () => {
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    expect(screen.getByLabelText(/^Descrição/)).not.toBeRequired();
    expect(screen.getByText('Registre uma cobrança para um irmão desta loja.')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));

    expect(screen.getByLabelText(/^Descrição/)).toBeRequired();
    expect(screen.getByLabelText(/^Descrição/)).toHaveAttribute('maxLength', '255');
    expect(
      screen.getByText('Registre a mesma cobrança para todos os irmãos ativos desta loja.')
    ).toBeInTheDocument();
  });

  it('em massa, descrição só com espaços bloqueia o envio e não chama lancarEmMassa', async () => {
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));
    await preencherSemDescricao(user);
    await user.type(screen.getByLabelText(/^Descrição/), '   ');
    await user.click(screen.getByRole('button', { name: 'Lançar para todos' }));

    expect(
      await screen.findByText('Informe a descrição para lançar o débito para todos os irmãos.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Descrição/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(debitosApi.lancarEmMassa).not.toHaveBeenCalled();
  });

  it('em massa, descrição vazia não abre a confirmação (validação nativa)', async () => {
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));
    await preencherSemDescricao(user);
    await user.click(screen.getByRole('button', { name: 'Lançar para todos' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(debitosApi.lancarEmMassa).not.toHaveBeenCalled();
  });

  it('em massa, envia a descrição sem espaços nas pontas', async () => {
    vi.mocked(debitosApi.lancarEmMassa).mockResolvedValue({ debitos_criados: [], membros_ignorados: [] });
    const user = userEvent.setup();
    renderNovo();

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.click(screen.getByLabelText('Aplicar a todos os irmãos ativos'));
    await preencherSemDescricao(user);
    await user.type(screen.getByLabelText(/^Descrição/), '  Rifa de Natal  ');
    await user.click(screen.getByRole('button', { name: 'Lançar para todos' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Lançar para todos' }));

    await waitFor(() =>
      expect(debitosApi.lancarEmMassa).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ descricao: 'Rifa de Natal' })
      )
    );
  });

  it('no modo individual a descrição segue opcional (vazia é enviada como null)', async () => {
    vi.mocked(debitosApi.create).mockResolvedValue(debitoAberto);
    const user = userEvent.setup();
    render(
      <StoreProvider>
      <MemoryRouter initialEntries={['/debitos/novo']}>
        <Routes>
          <Route path="/debitos/novo" element={<DebitoFormPage />} />
          <Route path="/debitos/:id" element={<p>Detalhe do débito</p>} />
        </Routes>
      </MemoryRouter>
      </StoreProvider>
    );

    await screen.findByRole('option', { name: 'Membro Teste' });
    await user.selectOptions(screen.getByLabelText(/^Membro/), '5');
    await preencherSemDescricao(user);
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(debitosApi.create).toHaveBeenCalledWith(5, expect.objectContaining({ descricao: null }))
    );
  });

  it('não oferece a opção em massa na edição', async () => {
    vi.mocked(debitosApi.get).mockResolvedValue(debitoAberto);
    renderEdit();

    await screen.findByRole('button', { name: 'Salvar' });
    expect(screen.queryByLabelText('Aplicar a todos os irmãos ativos')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Membro/)).toBeInTheDocument();
  });
});

function ListaStub() {
  const location = useLocation();
  return <p data-testid="lista-state">{JSON.stringify(location.state)}</p>;
}
