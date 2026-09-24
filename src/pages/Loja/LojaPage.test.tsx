import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LojaPage from './LojaPage';
import { lojaApi } from '../../api/loja';
import { debitosRecorrentesApi } from '../../api/debitosRecorrentes';
import type { Loja } from '../../types/loja';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/debitosRecorrentes');

const loja: Loja = {
  id: 1,
  nome: 'Loja Teste',
  numero: '123',
  cnpj: '00.000.000/0001-00',
  logo_url: null,
  telefone: null,
  email: null,
  pix_chave: 'chave@pix',
  pix_descricao: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage(entry = '/loja') {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/loja" element={<LojaPage />} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

describe('LojaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([]);
  });

  it('não exibe mais o valor da mensalidade; seção de PIX e débitos recorrentes presentes', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Loja Teste')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'PIX' })).toBeInTheDocument();
    expect(screen.queryByText(/Valor da mensalidade/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Débitos recorrentes' })).toBeInTheDocument();
    expect(document.getElementById('debitos-recorrentes')).not.toBeNull();
    await waitFor(() => expect(debitosRecorrentesApi.list).toHaveBeenCalledWith(1));
  });

  it('salva a loja sem enviar mensalidade_valor', async () => {
    vi.mocked(lojaApi.update).mockResolvedValue(loja);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Loja Teste')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Editar informações/ }));

    expect(screen.queryByLabelText(/mensalidade/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(lojaApi.update).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(lojaApi.update).mock.calls[0][1];
    expect(payload).not.toHaveProperty('mensalidade_valor');
    expect(payload).toMatchObject({ nome: 'Loja Teste', pix_chave: 'chave@pix' });
    expect(await screen.findByText(/Dados da Loja atualizados com sucesso\./)).toBeInTheDocument();
  });

  it('rola até a seção de débitos recorrentes quando acessada por #debitos-recorrentes', async () => {
    const scrollIntoView = vi.fn();
    // jsdom não implementa scrollIntoView.
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      renderPage('/loja#debitos-recorrentes');

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('debitos-recorrentes'));
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  async function abrirEdicao() {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Loja Teste')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Editar informações/ }));
    return user;
  }

  it.each(['http://exemplo.com/logo.png', 'data:image/png;base64,AAAA', 'file:///etc/passwd', '/logo.png'])(
    'bloqueia no cliente logo_url inválida (%s) e mostra o erro no campo',
    async (url) => {
      const user = await abrirEdicao();
      await user.type(screen.getByLabelText('URL do logo'), url);
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText(/Informe uma URL https:\/\/ válida/)).toBeInTheDocument();
      expect(screen.getByLabelText('URL do logo')).toHaveAttribute('aria-invalid', 'true');
      expect(lojaApi.update).not.toHaveBeenCalled();
    }
  );

  it('envia logo_url https válida e envia null quando vazia', async () => {
    vi.mocked(lojaApi.update).mockResolvedValue(loja);
    const user = await abrirEdicao();
    await user.type(screen.getByLabelText('URL do logo'), 'https://exemplo.com/logo.png');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(lojaApi.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(lojaApi.update).mock.calls[0][1]).toMatchObject({
      logo_url: 'https://exemplo.com/logo.png',
    });
  });

  it('exibe no campo o erro 422 do backend para logo_url e limpa ao editar', async () => {
    vi.mocked(lojaApi.update).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'logo_url'], msg: 'Value error, logo_url deve ser uma URL https:// valida.' },
          ],
        },
      },
    });
    const user = await abrirEdicao();
    await user.type(screen.getByLabelText('URL do logo'), 'https://exemplo.com/logo.png');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('logo_url deve ser uma URL https:// valida.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Verifique os campos destacados.');
    const input = screen.getByLabelText('URL do logo');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    await user.type(input, 'x');
    expect(screen.queryByText('logo_url deve ser uma URL https:// valida.')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('limita o tamanho dos textos conforme o backend', async () => {
    await abrirEdicao();
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute('maxLength', '255');
    expect(screen.getByLabelText(/CNPJ/)).toHaveAttribute('maxLength', '18');
    expect(screen.getByLabelText('URL do logo')).toHaveAttribute('maxLength', '500');
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('maxLength', '20');
  });
});
