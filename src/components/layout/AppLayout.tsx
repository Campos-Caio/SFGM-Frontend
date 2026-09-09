import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

/** App Shell: header + sidebar (fixa em desktop, drawer em mobile) + conteúdo. */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onOpenMobileMenu={() => setMobileNavOpen(true)} />
      <div className="flex">
        <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-app w-full px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
