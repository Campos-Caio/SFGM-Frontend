import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DocumentosPage from './DocumentosPage';
import { lojaApi } from '../../api/loja';
import { membrosApi } from '../../api/membros';
import { documentosApi } from '../../api/documentos';
import type { Loja } from '../../types/loja';
import type { Membro } from '../../types/membro';
import type { DocumentoMembroData } from '../../types/documentoMembro';

vi.mock('../../api/loja');
vi.mock('../../api/membros');
vi.mock('../../api/documentos');

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
  nome: 'Membro Teste',
  cim: '00001',
  telefone: '11999999999',
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const outroMembro: Membro = {
  id: 9,
  loja_id: 1,
  nome: 'Outro Membro',
  cim: '00002',
  telefone: null,
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const documento: DocumentoMembroData = {
  loja,
  membro,
  competencia_cobranca: '2026-08-01',
  competencia_prestacao: '2026-07-01',
  debitos: [],
  total_debitos: '0.00',
  prestacao_contas: {
    loja_id: 1,
    competencia: '2026-07-01',
    receitas: [],
    total_receitas: '0.00',
    despesas: [],
    total_despesas: '0.00',
    resultado: '0.00',
  },
};

function renderPage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/documentos" element={<DocumentosPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DocumentosPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(membrosApi.list).mockResolvedValue([membro, outroMembro]);
    vi.mocked(documentosApi.get).mockResolvedValue(documento);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca o documento automaticamente com o mês atual ao chegar com ?membro_id válido na URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-24T12:00:00Z'));

    renderPage('/documentos?membro_id=5');

    await waitFor(() =>
      expect(documentosApi.get).toHaveBeenCalledWith(1, 5, '2026-08-01')
    );

    expect(await screen.findByText('Irmão:')).toBeInTheDocument();
    expect(documentosApi.get).toHaveBeenCalledTimes(1);
  });

  it('não busca automaticamente quando o membro_id da URL não pertence à loja', async () => {
    renderPage('/documentos?membro_id=999');

    await waitFor(() => expect(membrosApi.list).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(documentosApi.get).not.toHaveBeenCalled();
  });

  it('mantém o fluxo manual funcionando quando não há membro_id na URL', async () => {
    const user = userEvent.setup();
    renderPage('/documentos');

    await waitFor(() => expect(membrosApi.list).toHaveBeenCalled());
    expect(documentosApi.get).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText('Irmão'), '5');
    await user.type(screen.getByLabelText('Competência de cobrança'), '2026-08');
    await user.click(screen.getByRole('button', { name: 'Visualizar documento' }));

    await waitFor(() =>
      expect(documentosApi.get).toHaveBeenCalledWith(1, 5, '2026-08-01')
    );
    expect(documentosApi.get).toHaveBeenCalledTimes(1);
  });
});
