import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DebitosListPage from './DebitosListPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import { debitosApi } from '../../api/debitos';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import type { DebitoMembro } from '../../types/debito';

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
  mensalidade_valor: null,
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
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/debitos']}>
      <Routes>
        <Route path="/debitos" element={<DebitosListPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DebitosListPage — filtros', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito]);
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
      screen.getByText(/1 membro\(s\) já estavam cobrados nesta competência\./)
    ).toBeInTheDocument();

    // recarrega a lista de débitos após o sucesso
    expect(debitosApi.listByLoja).toHaveBeenCalledTimes(2);
  });

  it('usa o mês atual como padrão quando nenhuma competência está selecionada no filtro', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockResolvedValue({
      debitos_criados: [],
      membros_ja_cobrados: [],
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Mensalidade agosto')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Gerar mensalidades' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Gerar mensalidades' }));

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    await waitFor(() =>
      expect(debitosApi.gerarMensalidades).toHaveBeenCalledWith(1, mesAtual)
    );
  });

  it('mostra mensagem amigável com link para a Loja quando a mensalidade não está configurada (422)', async () => {
    vi.mocked(debitosApi.gerarMensalidades).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
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
      screen.getByRole('link', { name: 'Configure o valor da mensalidade na Loja' })
    ).toHaveAttribute('href', '/loja');
  });
});
