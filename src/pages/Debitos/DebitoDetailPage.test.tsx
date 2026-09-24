import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DebitoDetailPage from './DebitoDetailPage';
import { membrosApi } from '../../api/membros';
import { debitosApi } from '../../api/debitos';
import type { Membro } from '../../types/membro';
import type { DebitoMembro } from '../../types/debito';

vi.mock('../../api/membros');
vi.mock('../../api/debitos');

const membro: Membro = {
  id: 5,
  loja_id: 1,
  nome: 'Membro Teste',
  cim: '00001',
  telefone: null,
  email: null,
  status: 'ATIVO',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const debitoAberto: DebitoMembro = {
  id: 20,
  membro_id: 5,
  tipo: 'MENSALIDADE',
  descricao: 'Mensalidade agosto',
  valor: '100.00',
  data: '2026-08-05',
  competencia: '2026-08-01',
  observacao: null,
  situacao: 'ABERTO',
  pago_em: null,
  data_pagamento: null,
  forma_pagamento: null,
  debito_recorrente_id: null,
  created_at: '2026-08-05T00:00:00Z',
  updated_at: '2026-08-05T00:00:00Z',
};

const debitoPago: DebitoMembro = {
  ...debitoAberto,
  situacao: 'PAGO',
  // 21/09/2026 02:30 UTC = 20/09/2026 22:30 em MS: a data efetiva é a de MS.
  pago_em: '2026-09-21T02:30:00+00:00',
  data_pagamento: '2026-09-20',
  forma_pagamento: 'TRANSFERENCIA',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/debitos/20']}>
      <Routes>
        <Route path="/debitos/:id" element={<DebitoDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DebitoDetailPage — situação da cobrança', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(membrosApi.get).mockResolvedValue(membro);
  });

  it('débito em aberto mostra a situação e mantém o link "Editar"', async () => {
    vi.mocked(debitosApi.get).mockResolvedValue(debitoAberto);
    renderPage();

    expect(await screen.findByText('Cobrança de Agosto/2026')).toBeInTheDocument();
    expect(screen.getByText('Em aberto')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Editar/ })).toHaveAttribute('href', '/debitos/20/editar');
    expect(screen.queryByText('Data do pagamento')).not.toBeInTheDocument();
  });

  it('débito pago mostra os dados da baixa (fuso de MS) e não oferece "Editar"', async () => {
    vi.mocked(debitosApi.get).mockResolvedValue(debitoPago);
    renderPage();

    expect(await screen.findByText('Cobrança de Agosto/2026')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('20/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Transferência')).toBeInTheDocument();
    expect(screen.getByText('20/09/2026 22:30')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar/ })).toBeInTheDocument();
  });
});
