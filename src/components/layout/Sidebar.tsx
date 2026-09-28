import { NavLink } from 'react-router-dom';
import {
  Building2,
  FileBarChart,
  FileText,
  HandCoins,
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from '../ui/Button';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    title: 'Principal',
    items: [{ to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Tesouraria',
    items: [
      { to: '/membros', label: 'Membros', icon: Users },
      { to: '/debitos', label: 'Débitos', icon: Receipt },
      { to: '/creditos', label: 'Créditos', icon: HandCoins },
      { to: '/lancamentos', label: 'Lançamentos', icon: Wallet },
    ],
  },
  {
    title: 'Prestação',
    items: [
      { to: '/prestacao-contas', label: 'Prestação de contas', icon: FileBarChart },
      { to: '/documentos', label: 'Documentos', icon: FileText },
    ],
  },
  {
    title: 'Configuração',
    items: [{ to: '/loja', label: 'Loja', icon: Building2 }],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.title} className="mb-6 last:mb-0">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group.title}
          </p>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon size={18} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Navegação principal: coluna fixa em telas médias/grandes; em telas
 * pequenas vira um drawer sobreposto controlado pelo hambúrguer do Header.
 */
export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop / tablet: coluna fixa */}
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <NavItems />
      </aside>

      {/* Mobile: drawer com overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <IconButton icon={X} aria-label="Fechar menu" size="sm" onClick={onCloseMobile} />
            </div>
            <NavItems onNavigate={onCloseMobile} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
