import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import MembrosListPage from './MembrosListPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import { StoreProvider } from '../../store/StoreProvider';

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

// Registra cada mudança de rota (pathname + search) para verificar quantas
// navegações aconteceram e para onde.
let visited: string[] = [];
function LocationSpy() {
  const location = useLocation();
  useEffect(() => {
    visited.push(location.pathname + location.search);
  }, [location]);
  return null;
}

function renderPage() {
  visited = [];
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={['/membros']}>
      <LocationSpy />
      <Routes>
        <Route path="/membros" element={<MembrosListPage />} />
        <Route path="/membros/:id" element={<div>Detalhe do membro</div>} />
        <Route path="/membros/:id/editar" element={<div>Tela de edição do membro</div>} />
        <Route path="/documentos" element={<div>Tela de documentos</div>} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
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

  it('o nome do membro é um link para a tela de detalhe (cobranças do membro)', async () => {
    const user = userEvent.setup();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro]);

    renderPage();

    const link = await screen.findByRole('link', { name: 'Fulano de Tal' });
    expect(link).toHaveAttribute('href', '/membros/10');

    await user.click(link);

    expect(await screen.findByText('Detalhe do membro')).toBeInTheDocument();
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

  describe('linha inteira clicável', () => {
    async function renderComMembro() {
      vi.mocked(lojaApi.list).mockResolvedValue([loja]);
      vi.mocked(membrosApi.list).mockResolvedValue([{ ...membro, email: 'fulano@example.com' }]);
      renderPage();
      await screen.findByText('Fulano de Tal');
      return userEvent.setup();
    }

    it('navega para o detalhe ao clicar em célula que não é o nome nem ação (CIM)', async () => {
      const user = await renderComMembro();
      const linha = screen.getByText('Fulano de Tal').closest('tr') as HTMLElement;

      await user.click(screen.getByText('12345'));

      expect(await screen.findByText('Detalhe do membro')).toBeInTheDocument();
      expect(visited).toEqual(['/membros', '/membros/10']);
      expect(linha).toHaveClass('cursor-pointer');
    });

    it('navega ao clicar no espaço vazio da coluna de ações (fora dos botões)', async () => {
      const user = await renderComMembro();
      const celulaAcoes = screen.getByRole('button', { name: 'Editar Fulano de Tal' }).closest('td') as HTMLElement;

      await user.click(celulaAcoes);

      expect(await screen.findByText('Detalhe do membro')).toBeInTheDocument();
    });

    it('o clique no link do nome navega uma única vez', async () => {
      const user = await renderComMembro();

      await user.click(screen.getByRole('link', { name: 'Fulano de Tal' }));

      expect(await screen.findByText('Detalhe do membro')).toBeInTheDocument();
      expect(visited).toEqual(['/membros', '/membros/10']);
    });

    it('"Ver membro" navega ao detalhe uma única vez (sem navegação duplicada da linha)', async () => {
      const user = await renderComMembro();

      await user.click(screen.getByRole('button', { name: 'Ver membro Fulano de Tal' }));

      expect(await screen.findByText('Detalhe do membro')).toBeInTheDocument();
      expect(visited).toEqual(['/membros', '/membros/10']);
    });

    it('"Editar" vai para a edição e não para o detalhe', async () => {
      const user = await renderComMembro();

      await user.click(screen.getByRole('button', { name: 'Editar Fulano de Tal' }));

      expect(await screen.findByText('Tela de edição do membro')).toBeInTheDocument();
      expect(visited).toEqual(['/membros', '/membros/10/editar']);
    });

    it('"Ver documento" vai para documentos com o membro e não para o detalhe', async () => {
      const user = await renderComMembro();

      await user.click(screen.getByRole('button', { name: 'Ver documento de Fulano de Tal' }));

      expect(await screen.findByText('Tela de documentos')).toBeInTheDocument();
      expect(visited).toEqual(['/membros', '/documentos?membro_id=10']);
    });

    it('o botão de status abre o diálogo de confirmação sem navegar para o detalhe', async () => {
      const user = await renderComMembro();

      await user.click(screen.getByRole('button', { name: 'Desativar Fulano de Tal' }));

      expect(await screen.findByRole('dialog', { name: 'Inativar membro' })).toBeInTheDocument();
      expect(screen.queryByText('Detalhe do membro')).not.toBeInTheDocument();
      expect(visited).toEqual(['/membros']);
    });

    it('não navega com Ctrl+clique na linha nem com texto selecionado', async () => {
      const user = await renderComMembro();
      const celulaCim = screen.getByText('12345');

      await user.keyboard('{Control>}');
      await user.click(celulaCim);
      await user.keyboard('{/Control}');
      expect(screen.queryByText('Detalhe do membro')).not.toBeInTheDocument();

      window.getSelection()?.selectAllChildren(celulaCim);
      fireEvent.click(celulaCim);
      expect(screen.queryByText('Detalhe do membro')).not.toBeInTheDocument();
      expect(visited).toEqual(['/membros']);

      window.getSelection()?.removeAllRanges();
      fireEvent.click(celulaCim);
      expect(await screen.findByText('Detalhe do membro')).toBeInTheDocument();
    });
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
