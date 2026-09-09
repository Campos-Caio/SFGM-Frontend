import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(<EmptyState title="Nenhum membro cadastrado" description="Cadastre o primeiro irmão." />);
    expect(screen.getByText('Nenhum membro cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro irmão.')).toBeInTheDocument();
  });

  it('renderiza a ação quando fornecida', () => {
    render(
      <EmptyState
        icon={Users}
        title="Nenhum membro cadastrado"
        action={<button type="button">Cadastrar primeiro membro</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Cadastrar primeiro membro' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('mostra a mensagem de erro amigável, sem detalhes técnicos', () => {
    render(<ErrorState message="Falha ao buscar membros" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao buscar membros');
  });

  it('chama onRetry ao clicar em "Tentar novamente"', async () => {
    let called = false;
    render(<ErrorState message="Erro" onRetry={() => (called = true)} />);
    const button = screen.getByRole('button', { name: 'Tentar novamente' });
    button.click();
    expect(called).toBe(true);
  });
});
