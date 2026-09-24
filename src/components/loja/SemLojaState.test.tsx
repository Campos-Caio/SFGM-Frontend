import type { ComponentType } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StoreProvider } from '../../store/StoreProvider';
import DashboardPage from '../../pages/Dashboard/DashboardPage';
import DebitosListPage from '../../pages/Debitos/DebitosListPage';
import DocumentosPage from '../../pages/Documentos/DocumentosPage';
import LancamentosPage from '../../pages/Lancamentos/LancamentosPage';
import MembrosListPage from '../../pages/Membros/MembrosListPage';
import PrestacaoContasPage from '../../pages/PrestacaoContas/PrestacaoContasPage';
import LojaPage from '../../pages/Loja/LojaPage';
import { lojaApi } from '../../api/loja';

vi.mock('../../api/loja');
vi.mock('../../api/membros');
vi.mock('../../api/debitos');
vi.mock('../../api/debitosRecorrentes');
vi.mock('../../api/documentos');
vi.mock('../../api/lancamentos');
vi.mock('../../api/prestacaoContas');

const telas: { nome: string; Page: ComponentType; novo?: RegExp }[] = [
  { nome: 'Visão geral', Page: DashboardPage, novo: /Novo lançamento|Novo débito/ },
  { nome: 'Débitos', Page: DebitosListPage, novo: /Novo débito/ },
  { nome: 'Documentos', Page: DocumentosPage },
  { nome: 'Lançamentos', Page: LancamentosPage, novo: /Novo lançamento/ },
  { nome: 'Membros', Page: MembrosListPage, novo: /Novo membro/ },
  { nome: 'Prestação de contas', Page: PrestacaoContasPage },
  { nome: 'Loja', Page: LojaPage },
];

describe('Estado "sem loja" nas telas', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([]);
  });

  it.each(telas)('$nome oferece "Cadastre a Loja", que abre o modal de cadastro', async ({ Page, novo }) => {
    const user = userEvent.setup();
    render(
      <StoreProvider>
        <MemoryRouter>
          <Page />
        </MemoryRouter>
      </StoreProvider>
    );

    expect(await screen.findByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument();
    // Atalhos para formulários que exigem loja não aparecem sem loja.
    if (novo) expect(screen.queryByRole('link', { name: novo })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cadastre a Loja' }));
    expect(screen.getByRole('dialog', { name: 'Cadastrar Loja' })).toBeInTheDocument();
  });
});
