import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  /** Ícone opcional exibido no botão de confirmação (ex.: Trash2 para exclusão). */
  confirmIcon?: LucideIcon;
  /** Ação destrutiva (exclusão/inativação) usa variante danger; caso contrário, primary. */
  destructive?: boolean;
}

/** Modal de confirmação padrão para ações destrutivas (excluir, inativar, etc.). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirmIcon,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            type="button"
            disabled={confirmDisabled}
            icon={confirmIcon}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
