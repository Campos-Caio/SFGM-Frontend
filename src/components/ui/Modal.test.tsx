import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza nada quando open é false', () => {
    render(
      <Modal open={false} title="Título" onClose={() => {}}>
        Conteúdo
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título, descrição e conteúdo quando aberto', () => {
    render(
      <Modal open title="Gerar mensalidades" description="Descrição do modal" onClose={() => {}}>
        Conteúdo do modal
      </Modal>
    );

    expect(screen.getByRole('dialog', { name: 'Gerar mensalidades' })).toBeInTheDocument();
    expect(screen.getByText('Descrição do modal')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
  });

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Título" onClose={onClose}>
        Conteúdo
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no botão de fechar', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Título" onClose={onClose}>
        Conteúdo
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
