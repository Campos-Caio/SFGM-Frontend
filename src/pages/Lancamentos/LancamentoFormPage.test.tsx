import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LancamentoFormPage from './LancamentoFormPage';
import { lojaApi } from '../../api/loja';
import { lancamentosApi } from '../../api/lancamentos';
import type { Loja } from '../../types/loja';
import type { Lancamento } from '../../types/lancamento';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/lancamentos');

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

// Instante de fronteira: 2026-09-01T02:30Z é 31/08/2026 22:30 em MS (UTC-4).
// "Hoje" para o formulário é 2026-08-31, não a data UTC (2026-09-01).
const AGORA = new Date('2026-09-01T02:30:00Z');
const HOJE_MS = '2026-08-31';

function renderNovo() {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={['/lancamentos/novo']}>
        <Routes>
          <Route path="/lancamentos/novo" element={<LancamentoFormPage />} />
          <Route path="/lancamentos/:id" element={<p>Detalhe do lançamento</p>} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>
  );
}

function renderEdit() {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={['/lancamentos/7/editar']}>
        <Routes>
          <Route path="/lancamentos/:id/editar" element={<LancamentoFormPage />} />
          <Route path="/lancamentos/:id" element={<p>Detalhe do lançamento</p>} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>
  );
}

async function preencherNovo(data: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByLabelText('Receita'));
  await user.type(screen.getByLabelText(/Categoria/), 'Doação');
  await user.type(screen.getByLabelText(/Valor/), '50');
  fireEvent.change(screen.getByLabelText(/^Data/), { target: { value: data } });
  fireEvent.change(screen.getByLabelText(/Competência/), { target: { value: '2026-08' } });
}

describe('LancamentoFormPage — data não pode ser futura', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(AGORA);
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('limita o campo Data a hoje no fuso de MS', async () => {
    renderNovo();

    expect(await screen.findByLabelText(/^Data/)).toHaveAttribute('max', HOJE_MS);
  });

  it('bloqueia o envio com data futura e exibe o erro junto ao campo', async () => {
    renderNovo();
    await preencherNovo('2026-09-01');

    // `fireEvent.submit` ignora a validação nativa (max) para exercitar a
    // validação do próprio formulário.
    fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar' }).closest('form')!);

    expect(await screen.findByText('A data não pode ser futura.')).toBeInTheDocument();
    expect(lancamentosApi.create).not.toHaveBeenCalled();
  });

  it('aceita a data de hoje (MS) e envia o lançamento', async () => {
    vi.mocked(lancamentosApi.create).mockResolvedValue({ ...lancamento, data: HOJE_MS });
    renderNovo();
    await preencherNovo(HOJE_MS);

    fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar' }).closest('form')!);

    await waitFor(() =>
      expect(lancamentosApi.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ data: HOJE_MS, competencia: '2026-08-01' })
      )
    );
    expect(screen.queryByText('A data não pode ser futura.')).not.toBeInTheDocument();
  });

  it('exibe a mensagem 422 do backend para data futura', async () => {
    vi.mocked(lancamentosApi.create).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'data'], msg: 'Value error, data nao pode ser uma data futura.' },
          ],
        },
      },
    });
    renderNovo();
    await preencherNovo(HOJE_MS);

    fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar' }).closest('form')!);

    expect(await screen.findByText(/data nao pode ser uma data futura/)).toBeInTheDocument();
  });
});

describe('LancamentoFormPage — lançamento gerado por pagamento de cobrança', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(lancamentosApi.get).mockResolvedValue(lancamento);
  });

  it('exibe a mensagem do 409 orientando a usar "Desfazer pagamento"', async () => {
    vi.mocked(lancamentosApi.update).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          detail:
            "Este lancamento foi gerado pelo pagamento de uma cobranca e nao pode ser editado diretamente. Use 'Desfazer pagamento' na cobranca do irmao.",
        },
      },
    });
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/Use 'Desfazer pagamento' na cobranca do irmao/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
});

describe('LancamentoFormPage — edição de lançamento automático', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
  });

  it.each([
    ['BAIXA_COBRANCA' as const, /use "Desfazer pagamento" na cobrança do irmão/],
    ['CREDITO_MEMBRO' as const, /exclua o crédito na ficha do irmão/],
  ])('%s aberto pela URL mostra aviso e nenhum formulário', async (origem, orientacao) => {
    vi.mocked(lancamentosApi.get).mockResolvedValue({ ...lancamento, origem });
    renderEdit();

    expect(
      await screen.findByText(/foi gerado automaticamente e não pode ser editado/)
    ).toBeInTheDocument();
    expect(screen.getByText(orientacao)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoria/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o lançamento' })).toHaveAttribute(
      'href',
      '/lancamentos/7'
    );
    expect(lancamentosApi.update).not.toHaveBeenCalled();
  });

  it('lançamento MANUAL continua editável', async () => {
    vi.mocked(lancamentosApi.get).mockResolvedValue(lancamento);
    renderEdit();

    expect(await screen.findByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Categoria/)).toHaveValue(lancamento.categoria);
  });
});
