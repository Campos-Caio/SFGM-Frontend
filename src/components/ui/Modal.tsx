import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  // Formulários com várias colunas (ex.: cadastro da Loja).
  xl: 'max-w-3xl',
};

/**
 * Modal genérico do design system (base para ConfirmDialog e outros diálogos,
 * ex.: geração de mensalidades). Fecha com ESC ou clique no overlay. Conteúdo
 * mais alto que a tela rola dentro do modal (título e rodapé ficam visíveis).
 */
export function Modal({ open, title, description, children, footer, onClose, size = 'md' }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col ${sizeClasses[size]} rounded-lg border border-slate-200 bg-white shadow-lg outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-slate-900 m-0">
              {title}
            </h3>
            {description ? <p className="mt-1 text-sm text-slate-500 m-0">{description}</p> : null}
          </div>
          <IconButton icon={X} aria-label="Fechar" size="sm" onClick={onClose} />
        </div>
        {children ? <div className="min-h-0 overflow-y-auto px-6 py-4 text-sm text-slate-700">{children}</div> : null}
        {footer ? (
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">{footer}</div>
        ) : (
          <div className="pb-5" />
        )}
      </div>
    </div>
  );
}
