import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';

interface Row {
  id: number;
  nome: string;
  valor: string;
}

const rows: Row[] = [
  { id: 1, nome: 'Mensalidade', valor: 'R$ 80,00' },
  { id: 2, nome: 'Doação', valor: 'R$ 20,00' },
];

describe('DataTable', () => {
  it('renderiza o cabeçalho e uma linha por item', () => {
    render(
      <DataTable
        rowKey={(r: Row) => r.id}
        rows={rows}
        columns={[
          { header: 'Nome', render: (r) => r.nome },
          { header: 'Valor', align: 'right', render: (r) => r.valor },
        ]}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Valor' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 cabeçalho + 2 linhas
    expect(screen.getByText('Mensalidade')).toBeInTheDocument();
    expect(screen.getByText('Doação')).toBeInTheDocument();
  });

  it('não renderiza nenhuma linha de dados quando rows está vazio', () => {
    render(
      <DataTable rowKey={(r: Row) => r.id} rows={[]} columns={[{ header: 'Nome', render: (r) => r.nome }]} />
    );
    expect(screen.getAllByRole('row')).toHaveLength(1); // apenas o cabeçalho
  });

  it('alinha a coluna à direita quando align="right"', () => {
    render(
      <DataTable
        rowKey={(r: Row) => r.id}
        rows={rows}
        columns={[{ header: 'Valor', align: 'right', render: (r) => r.valor }]}
      />
    );
    expect(screen.getByRole('columnheader', { name: 'Valor' }).className).toContain('text-right');
  });

  it('sem onRowClick a linha não é sinalizada como clicável', () => {
    render(<DataTable rowKey={(r: Row) => r.id} rows={rows} columns={[{ header: 'Nome', render: (r) => r.nome }]} />);
    expect(screen.getByText('Mensalidade').closest('tr')?.className).not.toContain('cursor-pointer');
  });

  it('com onRowClick, clicar na célula chama o handler com a linha; controles interativos não disparam', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onBotao = vi.fn();
    render(
      <DataTable
        rowKey={(r: Row) => r.id}
        rows={rows}
        onRowClick={onRowClick}
        columns={[
          { header: 'Nome', render: (r) => r.nome },
          {
            header: 'Ações',
            render: (r) => (
              <button type="button" onClick={() => onBotao(r.id)}>
                Agir {r.id}
              </button>
            ),
          },
        ]}
      />
    );

    expect(screen.getByText('Mensalidade').closest('tr')).toHaveClass('cursor-pointer');

    await user.click(screen.getByText('Doação'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);

    await user.click(screen.getByRole('button', { name: 'Agir 1' }));
    expect(onBotao).toHaveBeenCalledWith(1);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});
