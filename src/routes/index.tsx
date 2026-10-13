import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { RequireAuth } from '../auth/RequireAuth';
import { RequireLoja } from '../store/RequireLoja';
import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import LojaPage from '../pages/Loja/LojaPage';
import MembrosListPage from '../pages/Membros/MembrosListPage';
import MembroFormPage from '../pages/Membros/MembroFormPage';
import MembroDetailPage from '../pages/Membros/MembroDetailPage';
import DebitosListPage from '../pages/Debitos/DebitosListPage';
import DebitoFormPage from '../pages/Debitos/DebitoFormPage';
import DebitoDetailPage from '../pages/Debitos/DebitoDetailPage';
import CobrancasPage from '../pages/Cobrancas/CobrancasPage';
import SaldosPage from '../pages/Saldos/SaldosPage';
import LancamentosPage from '../pages/Lancamentos/LancamentosPage';
import LancamentoFormPage from '../pages/Lancamentos/LancamentoFormPage';
import LancamentoDetailPage from '../pages/Lancamentos/LancamentoDetailPage';
import PrestacaoContasPage from '../pages/PrestacaoContas/PrestacaoContasPage';
import CaixaPage from '../pages/Caixa/CaixaPage';
import DocumentosPage from '../pages/Documentos/DocumentosPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Todas as telas de negócio exigem sessão (a API retorna 401 sem token).
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },

          { path: 'loja', element: <LojaPage /> },

          { path: 'membros', element: <MembrosListPage /> },
          { path: 'membros/:id', element: <MembroDetailPage /> },

          { path: 'debitos', element: <DebitosListPage /> },
          { path: 'debitos/:id', element: <DebitoDetailPage /> },

          { path: 'cobrancas', element: <CobrancasPage /> },
          // Endereço antigo da tela de cobranças (a aba se chamava "Créditos").
          { path: 'creditos', element: <Navigate to="/cobrancas" replace /> },

          { path: 'saldos', element: <SaldosPage /> },

          { path: 'lancamentos', element: <LancamentosPage /> },
          { path: 'lancamentos/:id', element: <LancamentoDetailPage /> },

          { path: 'caixa', element: <CaixaPage /> },

          { path: 'prestacao-contas', element: <PrestacaoContasPage /> },

          { path: 'documentos', element: <DocumentosPage /> },

          {
            // Formulários que gravam dados da loja: sem loja cadastrada, o
            // guarda mostra "Cadastre a Loja" no lugar do formulário.
            element: <RequireLoja />,
            children: [
              { path: 'membros/novo', element: <MembroFormPage /> },
              { path: 'membros/:id/editar', element: <MembroFormPage /> },
              { path: 'debitos/novo', element: <DebitoFormPage /> },
              { path: 'debitos/:id/editar', element: <DebitoFormPage /> },
              { path: 'lancamentos/novo', element: <LancamentoFormPage /> },
              { path: 'lancamentos/:id/editar', element: <LancamentoFormPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
