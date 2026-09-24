import { useState } from 'react';
import { LogOut, Menu, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { IconButton } from '../ui/Button';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

/** Barra de aplicação: marca, contexto da loja atual e usuário logado (com logout). */
export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { loja } = useCurrentStore();
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    setSaindo(true);
    await logout();
    navigate('/login', { replace: true });
  }

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
        <span className="text-base font-semibold text-slate-900">SFGM</span>
        <span className="hidden sm:inline text-sm text-slate-400">Sistema de Tesouraria</span>
      </div>

      <div className="ml-auto flex items-center gap-3 min-w-0">
        {loja ? (
          <span className="hidden sm:block truncate text-sm text-slate-600" title={loja.nome}>
            {loja.nome} nº {loja.numero}
          </span>
        ) : null}
        <div className="flex items-center gap-2 min-w-0 border-l border-slate-200 pl-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-hidden="true"
          >
            <UserCircle size={20} />
          </span>
          {usuario ? (
            <span
              className="hidden sm:block max-w-[12rem] truncate text-sm font-medium text-slate-700"
              title={usuario.nome}
            >
              {usuario.nome}
            </span>
          ) : null}
          <IconButton
            icon={LogOut}
            aria-label="Sair"
            title="Sair"
            size="sm"
            disabled={saindo}
            onClick={() => void handleLogout()}
          />
        </div>
      </div>
    </header>
  );
}
