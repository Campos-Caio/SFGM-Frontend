import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
