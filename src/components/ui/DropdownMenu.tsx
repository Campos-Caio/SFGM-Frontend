import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DropdownMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Estilo de destaque para ações destrutivas (ex.: Inativar, Excluir). */
  destructive?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  /** Rótulo acessível do botão acionador (ex.: "Ações de Fulano de Tal"). */
  triggerLabel: string;
  trigger?: ReactNode;
}

/**
 * Menu de ações contextual (botão "⋮"), usado para agrupar ações secundárias
 * em tabelas administrativas (ver seção 18 da refatoração visual — Membros).
 */
export function DropdownMenu({ items, triggerLabel, trigger }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {trigger ?? <MoreHorizontal size={16} aria-hidden="true" />}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={triggerLabel}
          className="absolute right-0 z-20 mt-1 w-48 origin-top-right rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  item.destructive ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
