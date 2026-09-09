import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LojaPage from './LojaPage';
import { lojaApi } from '../../api/loja';
import type { Loja } from '../../types/loja';

vi.mock('../../api/loja');

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
  mensalidade_valor: '80.00',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/loja']}>
      <Routes>
        <Route path="/loja" element={<LojaPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LojaPage — valor da mensalidade', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
  });

  it('exibe o valor da mensalidade formatado na visualização', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('R$ 80,00')).toBeInTheDocument());
  });

  it('mostra "-" quando a mensalidade não está configurada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([{ ...loja, mensalidade_valor: null }]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Loja Teste')).toBeInTheDocument());
    const label = screen.getByText('Valor da mensalidade');
    expect(label.parentElement).toHaveTextContent('-');
  });

  it('salva o valor da mensalidade preenchido no formulário de edição', async () => {
    const atualizado: Loja = { ...loja, mensalidade_valor: '95.50' };
    vi.mocked(lojaApi.update).mockResolvedValue(atualizado);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Loja Teste')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Editar informações/ }));

    const campoMensalidade = await screen.findByLabelText('Valor da mensalidade (R$)');
    expect(campoMensalidade).toHaveValue(80);

    await user.clear(campoMensalidade);
    await user.type(campoMensalidade, '95.50');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(lojaApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ mensalidade_valor: '95.5' })
      )
    );
    await waitFor(() =>
      expect(screen.getByText(/Dados da Loja atualizados com sucesso\./)).toBeInTheDocument()
    );
  });

  it('envia null quando o campo de mensalidade é deixado em branco', async () => {
    vi.mocked(lojaApi.update).mockResolvedValue({ ...loja, mensalidade_valor: null });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Loja Teste')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Editar informações/ }));

    const campoMensalidade = await screen.findByLabelText('Valor da mensalidade (R$)');
    await user.clear(campoMensalidade);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(lojaApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ mensalidade_valor: null })
      )
    );
  });
});
