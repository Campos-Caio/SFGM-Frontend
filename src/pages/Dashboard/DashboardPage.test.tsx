import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { lojaApi } from '../../api/loja';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import { debitosApi } from '../../api/debitos';
import { caixaApi } from '../../api/caixa';
import { creditosMembroApi } from '../../api/creditosMembro';
import type { Loja } from '../../types/loja';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import type { DebitoMembro } from '../../types/debito';
import type { Caixa } from '../../types/caixa';
import type { SaldoMembro } from '../../types/creditoMembro';
import { StoreProvider } from '../../store/StoreProvider';

vi.mock('../../api/loja');
vi.mock('../../api/prestacaoContas');
vi.mock('../../api/debitos');
vi.mock('../../api/caixa');
vi.mock('../../api/creditosMembro');

const loja: Loja = {
  id: 1,
  nome: 'Templários do Asfalto',
  numero: '28',
  cnpj: '00.000.000/0001-00',
  logo_url: null,
  telefone: null,
  email: null,
  pix_chave: null,
  pix_descricao: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const prestacao: PrestacaoContas = {
  loja_id: 1,
  competencia: '2026-08-01',
  receitas: [],
  total_receitas: '200.00',
  despesas: [],
  total_despesas: '80.00',
  resultado: '120.00',
};

const debito: DebitoMembro = {
  id: 1,
  membro_id: 5,
  tipo: 'MENSALIDADE',
  descricao: null,
  valor: '80.00',
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

const caixa: Caixa = {
  loja_id: 1,
  saldo_inicial: '1000.00',
  total_receitas: '500.00',
  total_despesas: '265.44',
  saldo_atual: '1234.56',
};

const saldoBase: SaldoMembro = {
  membro_id: 5,
  membro_nome: 'Alice',
  membro_status: 'ATIVO',
  total_em_aberto: '0.00',
  total_a_vencer: '0.00',
  qtd_cobrancas_em_aberto: 0,
  total_credito: '0.00',
  saldo: '0.00',
  situacao: 'EM_DIA',
};
const saldos: SaldoMembro[] = [
  { ...saldoBase, total_em_aberto: '180.00', total_credito: '30.00', saldo: '-150.00', situacao: 'DEVEDOR' },
  { ...saldoBase, membro_id: 6, membro_nome: 'Bruno', total_em_aberto: '150.10', saldo: '-150.10', situacao: 'DEVEDOR' },
  { ...saldoBase, membro_id: 7, membro_nome: 'Carlos', total_credito: '15.50', saldo: '15.50', situacao: 'CREDOR' },
];

function renderPage() {
  return render(
    <StoreProvider>
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>
    </StoreProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(lojaApi.list).mockResolvedValue([loja]);
    vi.mocked(prestacaoContasApi.get).mockResolvedValue(prestacao);
    vi.mocked(debitosApi.listByLoja).mockResolvedValue([debito]);
    vi.mocked(caixaApi.get).mockResolvedValue(caixa);
    vi.mocked(creditosMembroApi.listSaldos).mockResolvedValue(saldos);
  });

  it('exibe o nome da loja e os indicadores do mês atual', async () => {
    renderPage();

    expect(await screen.findByText(/Templários do Asfalto nº 28/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('R$ 200,00')).toBeInTheDocument());
    expect(screen.getByText('R$ 80,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument();
    expect(screen.getByText('Débitos do mês')).toBeInTheDocument();
  });

  it('exibe o saldo atual do caixa com link para a tela do Caixa', async () => {
    renderPage();

    expect(await screen.findByText('R$ 1.234,56')).toBeInTheDocument();
    expect(caixaApi.get).toHaveBeenCalledWith(1);
    expect(screen.getByText('Saldo do caixa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver caixa' })).toHaveAttribute('href', '/caixa');
  });

  it('destaca o saldo do caixa negativo', async () => {
    vi.mocked(caixaApi.get).mockResolvedValue({ ...caixa, saldo_atual: '-50.00' });
    renderPage();

    const valor = await screen.findByText('-R$ 50,00');
    expect(valor).toHaveClass('text-red-600');
    expect(screen.getByText(/Saldo negativo/)).toBeInTheDocument();
  });

  it('exibe atalhos de ações rápidas para as tarefas mais comuns', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('R$ 200,00')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Novo lançamento/i })).toHaveAttribute(
      'href',
      '/lancamentos/novo'
    );
    expect(screen.getByRole('link', { name: /Novo débito/i })).toHaveAttribute('href', '/debitos/novo');
    expect(screen.getByRole('link', { name: /Gerar mensalidades/i })).toHaveAttribute('href', '/debitos');
  });

  /** Cartão de indicador (StatCard) cujo rótulo é `label`. */
  function indicador(label: string): HTMLElement {
    return screen.getByText(label).closest('div.rounded-lg') as HTMLElement;
  }

  it('mostra o total em aberto (vencido) com o nº de devedores e o total de créditos dos irmãos', async () => {
    renderPage();

    expect(await screen.findByText('R$ 330,10')).toBeInTheDocument();
    expect(creditosMembroApi.listSaldos).toHaveBeenCalledWith(1);
    const emAberto = indicador('Em aberto (vencido)');
    expect(within(emAberto).getByText('R$ 330,10')).toHaveClass('text-red-600');
    expect(within(emAberto).getByText(/2 irmão\(s\) devedor\(es\)/)).toBeInTheDocument();
    expect(within(emAberto).getByRole('link', { name: 'Ver devedores' })).toHaveAttribute(
      'href',
      '/saldos?situacao=DEVEDOR'
    );
    const creditos = indicador('Créditos de irmãos');
    expect(within(creditos).getByText('R$ 45,50')).toBeInTheDocument();
    expect(within(creditos).getByRole('link', { name: 'Ver saldos' })).toHaveAttribute('href', '/saldos');
  });

  it('falha dos saldos não derruba o painel e pode ser repetida', async () => {
    vi.mocked(creditosMembroApi.listSaldos)
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { detail: 'x' } } })
      .mockResolvedValue(saldos);
    const user = userEvent.setup();
    renderPage();

    // Os demais indicadores continuam visíveis.
    expect(await screen.findByText('R$ 1.234,56')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(indicador('Em aberto (vencido)')).getByText(/Não foi possível carregar/)).toBeInTheDocument()
    );

    await user.click(within(indicador('Em aberto (vencido)')).getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('R$ 330,10')).toBeInTheDocument();
  });

  it('falha dos demais indicadores não esconde os saldos dos irmãos', async () => {
    vi.mocked(caixaApi.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Falha no caixa.' } },
    });
    renderPage();

    expect(await screen.findByText('Falha no caixa.')).toBeInTheDocument();
    expect(await screen.findByText('R$ 330,10')).toBeInTheDocument();
  });

  it('mostra aviso quando não há loja cadastrada', async () => {
    vi.mocked(lojaApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Nenhuma loja cadastrada no sistema')).toBeInTheDocument()
    );
  });
});
