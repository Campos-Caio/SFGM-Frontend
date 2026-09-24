import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DebitosRecorrentesSection } from './DebitosRecorrentesSection';
import { debitosRecorrentesApi } from '../../api/debitosRecorrentes';
import type { DebitoRecorrente } from '../../types/debito';

vi.mock('../../api/debitosRecorrentes');

function item(overrides: Partial<DebitoRecorrente>): DebitoRecorrente {
  return {
    id: 1,
    loja_id: 1,
    tipo: 'MENSALIDADE',
    descricao: 'Mensalidade',
    valor: '100.00',
    ativo: true,
    ordem: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const mensalidade = item({ id: 1, descricao: 'Mensalidade mensal', valor: '100.00' });
const cotizacao = item({ id: 2, tipo: 'COTIZACAO', descricao: 'Cotização anual', valor: '30.10', ordem: 1 });
const taxaInativa = item({ id: 3, tipo: 'TAXA', descricao: 'Taxa antiga', valor: '9.99', ativo: false, ordem: 2 });

function renderSection() {
  return render(
    <MemoryRouter>
      <DebitosRecorrentesSection lojaId={1} />
    </MemoryRouter>
  );
}

function linha(descricao: string) {
  return screen.getByText(descricao).closest('tr') as HTMLElement;
}

describe('DebitosRecorrentesSection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([mensalidade, cotizacao, taxaInativa]);
  });

  it('lista os itens com situação e soma apenas os ativos no total por irmão', async () => {
    renderSection();

    await screen.findByText('Cotização anual');
    expect(within(linha('Mensalidade mensal')).getByText('Ativo')).toBeInTheDocument();
    expect(within(linha('Taxa antiga')).getByText('Inativo')).toBeInTheDocument();
    expect(screen.getByText(/Total por irmão \(itens ativos\)/)).toHaveTextContent('R$ 130,10');
  });

  it('estado vazio explica que sem itens ativos não é possível gerar mensalidades', async () => {
    vi.mocked(debitosRecorrentesApi.list).mockResolvedValue([]);
    renderSection();

    expect(await screen.findByText('Nenhum débito recorrente cadastrado')).toBeInTheDocument();
    expect(screen.getByText(/Sem itens ativos não é possível gerar mensalidades/)).toBeInTheDocument();
  });

  it('mostra erro de carregamento com opção de tentar novamente', async () => {
    vi.mocked(debitosRecorrentesApi.list).mockRejectedValueOnce(new Error('falhou'));
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText('falhou')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(await screen.findByText('Cotização anual')).toBeInTheDocument();
  });

  it('cria um item com os valores padrão (ordem 0, ativo) e recarrega a lista', async () => {
    vi.mocked(debitosRecorrentesApi.create).mockResolvedValue(item({ id: 9, descricao: 'Mútua' }));
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('Cotização anual');
    await user.click(screen.getByRole('button', { name: 'Novo débito recorrente' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Alterações não afetam débitos já gerados');
    expect(within(dialog).getByLabelText(/^Ordem/)).toHaveValue(0);
    expect(within(dialog).getByLabelText('Ativo')).toBeChecked();

    await user.selectOptions(within(dialog).getByLabelText(/^Tipo/), 'MUTUA');
    await user.type(within(dialog).getByLabelText(/^Descrição/), '  Mútua ');
    await user.type(within(dialog).getByLabelText(/^Valor/), '12.5');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(debitosRecorrentesApi.create).toHaveBeenCalledWith(1, {
        tipo: 'MUTUA',
        descricao: 'Mútua',
        valor: '12.5',
        ativo: true,
        ordem: 0,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(debitosRecorrentesApi.list).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Débito recorrente "Mútua" cadastrado.')).toBeInTheDocument();
  });

  it('mantém o modal aberto e mostra o 409 de descrição duplicada', async () => {
    vi.mocked(debitosRecorrentesApi.update).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'Ja existe um debito recorrente com esta descricao.' } },
    });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('Cotização anual');
    await user.click(within(linha('Cotização anual')).getByRole('button', { name: /Editar/ }));
    const dialog = await screen.findByRole('dialog');
    const descricao = within(dialog).getByLabelText(/^Descrição/);
    expect(descricao).toHaveValue('Cotização anual');
    await user.clear(descricao);
    await user.type(descricao, 'Mensalidade');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Ja existe um debito recorrente com esta descricao.'
    );
    // PUT envia o corpo completo.
    expect(debitosRecorrentesApi.update).toHaveBeenCalledWith(1, 2, {
      tipo: 'COTIZACAO',
      descricao: 'Mensalidade',
      valor: '30.10',
      ativo: true,
      ordem: 1,
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('alterna ativo via PUT com o corpo completo', async () => {
    vi.mocked(debitosRecorrentesApi.update).mockResolvedValue({ ...taxaInativa, ativo: true });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('Taxa antiga');
    await user.click(within(linha('Taxa antiga')).getByRole('button', { name: /Ativar/ }));

    await waitFor(() =>
      expect(debitosRecorrentesApi.update).toHaveBeenCalledWith(1, 3, {
        tipo: 'TAXA',
        descricao: 'Taxa antiga',
        valor: '9.99',
        ativo: true,
        ordem: 2,
      })
    );
    expect(await screen.findByText('Débito recorrente "Taxa antiga" ativado.')).toBeInTheDocument();
    expect(debitosRecorrentesApi.list).toHaveBeenCalledTimes(2);
  });

  it('exclui após confirmação e recarrega a lista', async () => {
    vi.mocked(debitosRecorrentesApi.remove).mockResolvedValue();
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('Taxa antiga');
    await user.click(within(linha('Taxa antiga')).getByRole('button', { name: /Excluir/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(debitosRecorrentesApi.remove).toHaveBeenCalledWith(1, 3));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(debitosRecorrentesApi.list).toHaveBeenCalledTimes(2);
  });

  it('no 409 de exclusão oferece "Desativar" direto no aviso', async () => {
    vi.mocked(debitosRecorrentesApi.remove).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'Este item ja gerou debitos; desative-o.' } },
    });
    vi.mocked(debitosRecorrentesApi.update).mockResolvedValue({ ...mensalidade, ativo: false });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('Cotização anual');
    await user.click(within(linha('Mensalidade mensal')).getByRole('button', { name: /Excluir/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(await within(dialog).findByText(/Este item ja gerou debitos; desative-o\./)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Excluir' })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: 'Desativar' }));

    await waitFor(() =>
      expect(debitosRecorrentesApi.update).toHaveBeenCalledWith(1, 1, {
        tipo: 'MENSALIDADE',
        descricao: 'Mensalidade mensal',
        valor: '100.00',
        ativo: false,
        ordem: 0,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Débito recorrente "Mensalidade mensal" desativado.')).toBeInTheDocument();
  });
});
