import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireLoja } from './RequireLoja';
import { StoreProvider } from './StoreProvider';
import MembroFormPage from '../pages/Membros/MembroFormPage';
import DebitoFormPage from '../pages/Debitos/DebitoFormPage';
import LancamentoFormPage from '../pages/Lancamentos/LancamentoFormPage';
import { lojaApi } from '../api/loja';
import { membrosApi } from '../api/membros';
import { debitosApi } from '../api/debitos';
import { lancamentosApi } from '../api/lancamentos';
import type { Loja } from '../types/loja';

vi.mock('../api/loja');
vi.mock('../api/membros');
vi.mock('../api/debitos');
vi.mock('../api/lancamentos');

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

// Mesma estrutura de routes/index.tsx: os formulários ficam sob o guarda.
function renderRoute(path: string) {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<RequireLoja />}>
            <Route path="/membros/novo" element={<MembroFormPage />} />
            <Route path="/membros/:id/editar" element={<MembroFormPage />} />
            <Route path="/debitos/novo" element={<DebitoFormPage />} />
            <Route path="/debitos/:id/editar" element={<DebitoFormPage />} />
            <Route path="/lancamentos/novo" element={<LancamentoFormPage />} />
            <Route path="/lancamentos/:id/editar" element={<LancamentoFormPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </StoreProvider>
  );
}

const formularios = [
  { path: '/membros/novo', titulo: 'Novo membro' },
  { path: '/debitos/novo', titulo: 'Novo débito' },
  { path: '/lancamentos/novo', titulo: 'Novo lançamento' },
];

describe('RequireLoja', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(membrosApi.list).mockResolvedValue([]);
  });

  it.each(formularios)('sem loja, bloqueia $path e oferece "Cadastre a Loja"', async ({ path, titulo }) => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderRoute(path);

    expect(await screen.findByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastre a Loja' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar/ })).not.toBeInTheDocument();
  });

  it.each([
    { path: '/membros/5/editar', get: () => membrosApi.get },
    { path: '/debitos/5/editar', get: () => debitosApi.get },
    { path: '/lancamentos/5/editar', get: () => lancamentosApi.get },
  ])('sem loja, bloqueia a edição $path sem carregar o registro', async ({ path, get }) => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderRoute(path);

    expect(await screen.findByRole('button', { name: 'Cadastre a Loja' })).toBeInTheDocument();
    expect(get()).not.toHaveBeenCalled();
  });

  it.each(formularios)('com loja, exibe o formulário de $path', async ({ path, titulo }) => {
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    renderRoute(path);

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma loja cadastrada no sistema')).not.toBeInTheDocument();
  });

  it('enquanto a loja carrega, não mostra nem o formulário nem o estado sem loja', async () => {
    let resolver: (lojas: Loja[]) => void = () => {};
    vi.mocked(lojaApi.list).mockReturnValue(
      new Promise<Loja[]>((resolve) => {
        resolver = resolve;
      })
    );
    renderRoute('/membros/novo');

    expect(screen.queryByRole('heading', { name: 'Novo membro' })).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma loja cadastrada no sistema')).not.toBeInTheDocument();

    resolver([loja]);
    expect(await screen.findByRole('heading', { name: 'Novo membro' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma loja cadastrada no sistema')).not.toBeInTheDocument();
  });

  it('exibe erro com "Tentar novamente" quando a loja não carrega e recupera ao repetir', async () => {
    vi.mocked(lojaApi.list).mockRejectedValueOnce(new Error('Falha de rede')).mockResolvedValue([loja]);
    const user = userEvent.setup();
    renderRoute('/membros/novo');

    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo membro' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Novo membro' })).toBeInTheDocument());
  });
});
