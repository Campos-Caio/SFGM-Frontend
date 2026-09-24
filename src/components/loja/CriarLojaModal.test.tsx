import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../auth/AuthProvider';
import { StoreProvider } from '../../store/StoreProvider';
import { AppLayout } from '../layout/AppLayout';
import LojaPage from '../../pages/Loja/LojaPage';
import { lojaApi } from '../../api/loja';
import { authApi } from '../../api/auth';
import { debitosRecorrentesApi } from '../../api/debitosRecorrentes';
import type { Loja } from '../../types/loja';

vi.mock('../../api/loja');
vi.mock('../../api/auth');
vi.mock('../../api/debitosRecorrentes');

const novaLoja: Loja = {
  id: 7,
  nome: 'Loja Nova',
  numero: '42',
  cnpj: '11.111.111/0001-11',
  logo_url: null,
  telefone: null,
  email: null,
  pix_chave: null,
  pix_descricao: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function apiError(status: number, detail: unknown) {
  return { isAxiosError: true, response: { status, data: { detail } } };
}

// Header (via AppLayout) e LojaPage compartilham o mesmo StoreProvider, como
// na aplicação (montado por RequireAuth).
function renderApp() {
  return render(
    <AuthProvider>
      <StoreProvider>
        <MemoryRouter initialEntries={['/loja']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/loja" element={<LojaPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </StoreProvider>
    </AuthProvider>
  );
}

async function abrirModal() {
  const user = userEvent.setup();
  renderApp();
  await user.click(await screen.findByRole('button', { name: 'Cadastre a Loja' }));
  const dialog = screen.getByRole('dialog', { name: 'Cadastrar Loja' });
  return { user, dialog };
}

async function preencherObrigatorios(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText(/Nome/), 'Loja Nova');
  await user.type(within(dialog).getByLabelText(/Número/), '42');
  await user.type(within(dialog).getByLabelText(/CNPJ/), '11.111.111/0001-11');
}

describe('Cadastro da Loja (CriarLojaModal)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    vi.mocked(authApi.me).mockResolvedValue({ id: 1, login: 't', nome: 'Tesoureiro', csrf_token: 'c' });
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([]);
  });

  it('carrega a loja uma única vez para Header e tela', async () => {
    renderApp();
    expect(await screen.findByRole('button', { name: 'Cadastre a Loja' })).toBeInTheDocument();
    expect(lojaApi.list).toHaveBeenCalledTimes(1);
  });

  it('cadastra a loja e atualiza Header e tela sem recarregar', async () => {
    vi.mocked(lojaApi.create).mockResolvedValue(novaLoja);
    const { user, dialog } = await abrirModal();
    vi.mocked(lojaApi.list).mockResolvedValue([novaLoja]);

    // O logo não é informado no cadastro (é definido depois, fora do modal).
    expect(within(dialog).queryByLabelText('URL do logo')).not.toBeInTheDocument();

    await preencherObrigatorios(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(lojaApi.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(lojaApi.create).mock.calls[0][0]).toEqual({
      nome: 'Loja Nova',
      numero: '42',
      cnpj: '11.111.111/0001-11',
      logo_url: null,
      telefone: null,
      email: null,
      pix_chave: null,
      pix_descricao: null,
    });

    // Header reflete a nova loja e a tela sai do estado "sem loja".
    expect(await screen.findByText('Loja Nova nº 42')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma loja cadastrada no sistema')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar informações/ })).toBeInTheDocument();
    expect(lojaApi.list).toHaveBeenCalledTimes(2);
  });

  it('mantém o modal aberto e exibe a mensagem do 409 (CNPJ duplicado)', async () => {
    vi.mocked(lojaApi.create).mockRejectedValue(apiError(409, 'Ja existe uma loja cadastrada com este CNPJ.'));
    const { user, dialog } = await abrirModal();

    await preencherObrigatorios(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar os dados. Ja existe uma loja cadastrada com este CNPJ.'
    );
    expect(screen.getByRole('dialog', { name: 'Cadastrar Loja' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cadastrar' })).toBeEnabled();
    expect(lojaApi.list).toHaveBeenCalledTimes(1);
  });

  it('exibe os erros 422 junto aos campos', async () => {
    vi.mocked(lojaApi.create).mockRejectedValue(
      apiError(422, [
        { loc: ['body', 'cnpj'], msg: 'CNPJ inválido.' },
        { loc: ['body', 'email'], msg: 'E-mail inválido.' },
      ])
    );
    const { user, dialog } = await abrirModal();

    await preencherObrigatorios(user, dialog);
    await user.type(within(dialog).getByLabelText('E-mail'), 'a@b.co');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(await within(dialog).findByText('CNPJ inválido.')).toBeInTheDocument();
    expect(within(dialog).getByText('E-mail inválido.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/CNPJ/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Verifique os campos destacados.');
  });

  it('fecha pelo Cancelar sem cadastrar', async () => {
    const { user, dialog } = await abrirModal();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastre a Loja' })).toBeInTheDocument();
    expect(lojaApi.create).not.toHaveBeenCalled();
  });
});

describe('Edição da Loja reflete no Header', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authApi.me).mockResolvedValue({ id: 1, login: 't', nome: 'Tesoureiro', csrf_token: 'c' });
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([]);
    vi.mocked(lojaApi.list).mockResolvedValue([novaLoja]);
  });

  it('após salvar a edição, o Header mostra o nome editado sem recarregar', async () => {
    const editada: Loja = { ...novaLoja, nome: 'Loja Renomeada' };
    vi.mocked(lojaApi.update).mockResolvedValue(editada);
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText('Loja Nova nº 42')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Editar informações/ }));
    vi.mocked(lojaApi.list).mockResolvedValue([editada]);

    const nome = screen.getByLabelText(/Nome/);
    await user.clear(nome);
    await user.type(nome, 'Loja Renomeada');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Loja Renomeada nº 42')).toBeInTheDocument();
    expect(screen.queryByText('Loja Nova nº 42')).not.toBeInTheDocument();
    expect(lojaApi.update).toHaveBeenCalledWith(7, expect.objectContaining({ nome: 'Loja Renomeada' }));
    expect(lojaApi.list).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Dados da Loja atualizados com sucesso\./)).toBeInTheDocument();
  });
});
