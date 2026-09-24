import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, SituacaoBadge, StatusBadge } from './Badge';

describe('Badge', () => {
  it('renderiza o conteúdo e aplica a classe da variante', () => {
    render(<Badge variant="success">Receita</Badge>);
    const badge = screen.getByText('Receita');
    expect(badge.className).toContain('emerald');
  });

  it('exibe o indicador de status quando dot=true', () => {
    const { container } = render(
      <Badge variant="danger" dot>
        Despesa
      </Badge>
    );
    expect(container.querySelector('span > span')).not.toBeNull();
  });
});

describe('StatusBadge', () => {
  it('mostra "Ativo" com variante de sucesso para status ATIVO', () => {
    render(<StatusBadge status="ATIVO" />);
    const badge = screen.getByText('Ativo');
    expect(badge.className).toContain('emerald');
  });

  it('mostra "Inativo" com variante neutra para status INATIVO', () => {
    render(<StatusBadge status="INATIVO" />);
    const badge = screen.getByText('Inativo');
    expect(badge.className).toContain('slate');
  });
});

describe('SituacaoBadge', () => {
  it('mostra "Em aberto" com variante de alerta para ABERTO', () => {
    render(<SituacaoBadge situacao="ABERTO" />);
    expect(screen.getByText('Em aberto').className).toContain('amber');
  });

  it('mostra "Parcial" com variante informativa para PARCIAL', () => {
    render(<SituacaoBadge situacao="PARCIAL" />);
    expect(screen.getByText('Parcial').className).toContain('blue');
  });

  it('mostra "Pago" com variante de sucesso para PAGO', () => {
    render(<SituacaoBadge situacao="PAGO" />);
    expect(screen.getByText('Pago').className).toContain('emerald');
  });
});
