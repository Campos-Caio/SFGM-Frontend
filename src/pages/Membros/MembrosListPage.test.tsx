import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MembrosListPage from './MembrosListPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';

// Mocka os módulos de API (não a rede real) — os componentes só conhecem
// lojaApi/membrosApi, então mockamos esses módulos diretamente.
vi.mock('../../api/loja');
vi.mock('../../api/membros');

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
  id: 10,
  loja_id: 1,
  nome: 'Fulano de Tal',
  cim: '12345',
  telefone: null,
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/membros']}>
      <Routes>
        <Route path="/membros" element={<MembrosListPage />} />
        <Route path="/membros/:id" element={<div>Detalhe do membro</div>} />
        <Route path="/membros/:id/editar" element={<div>Tela de edição do membro</div>} />
        <Route path="/documentos" element={<div>Tela de documentos</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MembrosListPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('mostra estado de carregamento e depois a lista de membros', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());
    expect(screen.getByText('12345')).toBeInTheDocument();
    const linha = screen.getByText('Fulano de Tal').closest('tr');
    expect(linha).not.toBeNull();
    expect(within(linha as HTMLElement).getByText('Ativo')).toBeInTheDocument();
    expect(membrosApi.list).toHaveBeenCalledWith(1);
  });

  it('mostra estado vazio quando não há membros', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Nenhum membro cadastrado')).toBeInTheDocument());
  });

  it('mostra mensagem de erro quando a API falha', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Falha ao buscar membros' } },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Falha ao buscar membros')).toBeInTheDocument()
    );
  });

  it('mostra aviso quando não há loja cadastrada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument()
    );
    expect(membrosApi.list).not.toHaveBeenCalled();
  });

  it('filtra membros por nome/CIM e por status', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    const outroMembro: Membro = { ...membro, id: 11, nome: 'Ciclano Beltrano', cim: '99999', status: 'INATIVO' };
    vi.mocked(membrosApi.list).mockResolvedValue([membro, outroMembro]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());
    expect(screen.getByText('Ciclano Beltrano')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar'), 'Fulano');
    expect(screen.getByText('Fulano de Tal')).toBeInTheDocument();
    expect(screen.queryByText('Ciclano Beltrano')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar'));
    await user.selectOptions(screen.getByLabelText('Status'), 'INATIVO');
    expect(screen.queryByText('Fulano de Tal')).not.toBeInTheDocument();
    expect(screen.getByText('Ciclano Beltrano')).toBeInTheDocument();
  });

  it('navega para a tela de detalhe ao clicar em "Ver membro"', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Ver membro Fulano de Tal' }));

    await waitFor(() => expect(screen.getByText('Detalhe do membro')).toBeInTheDocument());
  });

  it('navega para a tela de edição ao clicar em "Editar"', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Editar Fulano de Tal' }));

    await waitFor(() => expect(screen.getByText('Tela de edição do membro')).toBeInTheDocument());
  });

  it('navega para a tela de documentos com o membro pré-selecionado ao clicar em "Ver documento"', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);

    renderPage();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Ver documento de Fulano de Tal' }));

    await waitFor(() => expect(screen.getByText('Tela de documentos')).toBeInTheDocument());
  });

  it('inativa um membro ativo ao confirmar no ConfirmDialog aberto pelo status', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
    vi.mocked(membrosApi.updateStatus).mockResolvedValue({ ...membro, status: 'INATIVO' });

    renderPage();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Desativar Fulano de Tal' }));

    const dialog = await screen.findByRole('dialog', { name: 'Inativar membro' });
    await user.click(within(dialog).getByRole('button', { name: 'Inativar' }));

    expect(membrosApi.updateStatus).toHaveBeenCalledWith(10, 'INATIVO');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const linha = screen.getByText('Fulano de Tal').closest('tr');
    await waitFor(() => expect(within(linha as HTMLElement).getByText('Inativo')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Ativar Fulano de Tal' })).toBeInTheDocument();
  });

  it('mostra erro quando a atualização de status falha, sem substituir a tabela', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);
    vi.mocked(membrosApi.updateStatus).mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Falha ao atualizar status' } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Fulano de Tal')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Desativar Fulano de Tal' }));

    const dialog = await screen.findByRole('dialog', { name: 'Inativar membro' });
    await user.click(within(dialog).getByRole('button', { name: 'Inativar' }));

    await waitFor(() =>
      expect(screen.getByText('Falha ao atualizar status')).toBeInTheDocument()
    );
    // A tabela continua visível — o erro não substitui a listagem inteira.
    const linha = screen.getByText('Fulano de Tal').closest('tr');
    expect(within(linha as HTMLElement).getByText('Ativo')).toBeInTheDocument();
  });
});
