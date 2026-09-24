import { Outlet } from 'react-router-dom';
import { ErrorState } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { SemLojaState } from '../components/loja/SemLojaState';
import { useCurrentStore } from '../hooks/useCurrentStore';

/**
 * Guarda de rotas que dependem de uma loja cadastrada (formulários de
 * membro, débito e lançamento): enquanto a loja carrega mostra apenas o
 * esqueleto; sem loja, mostra o estado vazio com "Cadastre a Loja" no lugar
 * do formulário. Com a loja cadastrada, as rotas filhas são exibidas.
 */
export function RequireLoja() {
  const { loja, loading, error, refresh } = useCurrentStore();

  if (loading) return <SkeletonCard />;

  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;

  if (!loja) {
    return <SemLojaState description="Cadastre a loja antes de continuar." />;
  }

  return <Outlet />;
}
