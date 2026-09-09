import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import type { Loja } from '../../types/loja';

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

describe('Navegação principal (Sidebar + AppLayout)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([]);
  });

  it('navega da tela de Loja para a tela de Membros ao clicar no link da sidebar', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/loja']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/loja" element={<div>Conteúdo da tela Loja</div>} />
            <Route path="/membros" element={<div>Conteúdo da tela Membros</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Sistema de Tesouraria')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo da tela Loja')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Membros' }));

    await waitFor(() =>
      expect(screen.getByText('Conteúdo da tela Membros')).toBeInTheDocument()
    );
    expect(screen.queryByText('Conteúdo da tela Loja')).not.toBeInTheDocument();
  });
});
