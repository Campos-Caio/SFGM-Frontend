import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu', () => {
  it('mantém o menu fechado até o botão de ações ser clicado', () => {
    render(<DropdownMenu triggerLabel="Ações de Fulano" items={[{ label: 'Editar', onSelect: () => {} }]} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('abre o menu, executa a ação selecionada e fecha o menu', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu
        triggerLabel="Ações de Fulano"
        items={[{ label: 'Editar', onSelect }, { label: 'Inativar', onSelect: () => {}, destructive: true }]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }));
    const menu = screen.getByRole('menu', { name: 'Ações de Fulano' });
    await user.click(within(menu).getByRole('menuitem', { name: 'Editar' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('fecha o menu ao pressionar Escape', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu triggerLabel="Ações de Fulano" items={[{ label: 'Editar', onSelect: () => {} }]} />);

    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
