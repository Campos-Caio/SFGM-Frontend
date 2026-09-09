import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, IconButton, LinkButton } from './Button';

describe('Button', () => {
  it('renderiza o texto e dispara onClick ao ser clicado', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Salvar</Button>);

    const button = screen.getByRole('button', { name: 'Salvar' });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('não dispara onClick quando desabilitado', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Salvar
      </Button>
    );

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renderiza o ícone opcional antes do texto', () => {
    render(<Button icon={Plus}>Novo</Button>);
    const button = screen.getByRole('button', { name: 'Novo' });
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('aplica a variante correta (ex.: danger usa fundo vermelho)', () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole('button', { name: 'Excluir' }).className).toContain('bg-red-600');
  });
});

describe('LinkButton', () => {
  it('renderiza um link de navegação com a mesma aparência do Button', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/membros/novo">Novo membro</LinkButton>
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Novo membro' });
    expect(link).toHaveAttribute('href', '/membros/novo');
  });
});

describe('IconButton', () => {
  it('exige e expõe um aria-label, já que não tem texto visível', () => {
    render(<IconButton icon={Plus} aria-label="Adicionar item" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Adicionar item' })).toBeInTheDocument();
  });
});
