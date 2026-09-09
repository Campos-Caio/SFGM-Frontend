import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import LojaPage from '../pages/Loja/LojaPage';
import MembrosListPage from '../pages/Membros/MembrosListPage';
import MembroFormPage from '../pages/Membros/MembroFormPage';
import MembroDetailPage from '../pages/Membros/MembroDetailPage';
import DebitosListPage from '../pages/Debitos/DebitosListPage';
import DebitoFormPage from '../pages/Debitos/DebitoFormPage';
import DebitoDetailPage from '../pages/Debitos/DebitoDetailPage';
import LancamentosPage from '../pages/Lancamentos/LancamentosPage';
import LancamentoFormPage from '../pages/Lancamentos/LancamentoFormPage';
import LancamentoDetailPage from '../pages/Lancamentos/LancamentoDetailPage';
import PrestacaoContasPage from '../pages/PrestacaoContas/PrestacaoContasPage';
import DocumentosPage from '../pages/Documentos/DocumentosPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },

      { path: 'loja', element: <LojaPage /> },

      { path: 'membros', element: <MembrosListPage /> },
      { path: 'membros/novo', element: <MembroFormPage /> },
      { path: 'membros/:id', element: <MembroDetailPage /> },
      { path: 'membros/:id/editar', element: <MembroFormPage /> },

      { path: 'debitos', element: <DebitosListPage /> },
      { path: 'debitos/novo', element: <DebitoFormPage /> },
      { path: 'debitos/:id', element: <DebitoDetailPage /> },
      { path: 'debitos/:id/editar', element: <DebitoFormPage /> },

      { path: 'lancamentos', element: <LancamentosPage /> },
      { path: 'lancamentos/novo', element: <LancamentoFormPage /> },
      { path: 'lancamentos/:id', element: <LancamentoDetailPage /> },
      { path: 'lancamentos/:id/editar', element: <LancamentoFormPage /> },

      { path: 'prestacao-contas', element: <PrestacaoContasPage /> },

      { path: 'documentos', element: <DocumentosPage /> },
    ],
  },
]);
