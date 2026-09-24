import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MembroFormPage from './MembroFormPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import { StoreProvider } from '../../store/StoreProvider';

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

function renderPage() {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={['/membros/novo']}>
      <Routes>
        <Route path="/membros/novo" element={<MembroFormPage />} />
        <Route path="/membros/:id" element={<div>Detalhe do membro criado</div>} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

describe('MembroFormPage (criação)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
  });

  it('envia o formulário e navega para o detalhe do membro criado', async () => {
    const criado: Membro = {
      id: 99,
      loja_id: 1,
      nome: 'Novo Membro',
      cim: '54321',
      telefone: null,
      email: null,
      status: 'ATIVO',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(membrosApi.create).mockResolvedValue(criado);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/^Nome/)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^Nome/), 'Novo Membro');
    await user.type(screen.getByLabelText(/^CIM/), '54321');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(screen.getByText('Detalhe do membro criado')).toBeInTheDocument()
    );

    expect(membrosApi.create).toHaveBeenCalledWith({
      nome: 'Novo Membro',
      cim: '54321',
      telefone: null,
      email: null,
      loja_id: 1,
    });
  });

  it('mostra mensagem de erro amigável quando a API rejeita (ex.: CIM duplicado)', async () => {
    vi.mocked(membrosApi.create).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'CIM já cadastrado nesta loja.' } },
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByLabelText(/^Nome/)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/^Nome/), 'Outro Membro');
    await user.type(screen.getByLabelText(/^CIM/), '11111');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(screen.getByText(/CIM já cadastrado nesta loja\./)).toBeInTheDocument()
    );
  });
});
