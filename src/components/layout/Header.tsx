import { Menu, UserCircle } from 'lucide-react';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { IconButton } from '../ui/Button';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

/** Barra de aplicação: marca, contexto da loja atual e espaço reservado para conta/usuário. */
export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { loja } = useCurrentStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <IconButton
        icon={Menu}
        aria-label="Abrir menu de navegação"
        size="sm"
        className="md:hidden"
        onClick={onOpenMobileMenu}
      />

      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-base font-semibold text-slate-900">Nantes</span>
        <span className="hidden sm:inline text-sm text-slate-400">Sistema de Tesouraria</span>
      </div>

      <div className="ml-auto flex items-center gap-3 min-w-0">
        {loja ? (
          <span className="hidden sm:block truncate text-sm text-slate-600" title={loja.nome}>
            {loja.nome} nº {loja.numero}
          </span>
        ) : null}
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          aria-label="Conta do usuário"
          title="Conta do usuário"
        >
          <UserCircle size={20} aria-hidden="true" />
        </span>
      </div>
    </header>
  );
}
