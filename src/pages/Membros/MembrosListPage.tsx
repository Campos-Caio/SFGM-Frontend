import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, FileText, Pencil, Plus, Search, Users } from 'lucide-react';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Alert,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterField,
  IconButton,
  Input,
  LinkButton,
  PageHeader,
  Select,
  StatusBadge,
} from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { Membro, MembroStatus } from '../../types/membro';

export default function MembrosListPage() {
  const navigate = useNavigate();
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<Set<number>>(new Set());
  const [confirmingMember, setConfirmingMember] = useState<Membro | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<MembroStatus | ''>('');

  function load(lojaId: number) {
    setLoading(true);
    setError(null);
    membrosApi
      .list(lojaId)
      .then(setMembros)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    load(loja.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja]);

  async function handleToggleStatus(membro: Membro) {
    setStatusUpdatingIds((prev) => new Set(prev).add(membro.id));
    setStatusError(null);
    try {
      const novoStatus = membro.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
      const updated = await membrosApi.updateStatus(membro.id, novoStatus);
      setMembros((prev) => prev && prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      setStatusError(extractErrorMessage(err));
    } finally {
      setStatusUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(membro.id);
        return next;
      });
    }
  }

  async function handleConfirmToggleStatus() {
    if (!confirmingMember) return;
    await handleToggleStatus(confirmingMember);
    setConfirmingMember(null);
  }

  const membrosFiltrados = useMemo(() => {
    if (!membros) return null;
    const termo = busca.trim().toLowerCase();
    return membros.filter((m) => {
      const combinaBusca = !termo || m.nome.toLowerCase().includes(termo) || m.cim.toLowerCase().includes(termo);
      const combinaStatus = !statusFiltro || m.status === statusFiltro;
      return combinaBusca && combinaStatus;
    });
  }, [membros, busca, statusFiltro]);

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Membros" />
        <SkeletonTable columns={3} />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Membros" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Membros" />
        <SemLojaState
          icon={Users}
          description="Cadastre a loja antes de adicionar membros."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Membros"
        description="Gerencie os irmãos cadastrados nesta loja."
        actions={
          <LinkButton to="/membros/novo" icon={Plus}>
            Novo membro
          </LinkButton>
        }
      />

      {statusError && <Alert variant="error">{statusError}</Alert>}

      {error ? (
        <ErrorState message={error} onRetry={() => load(loja.id)} />
      ) : loading ? (
        <SkeletonTable columns={3} />
      ) : !membros || membros.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro cadastrado"
          description="Cadastre o primeiro irmão desta loja para começar a controlar débitos e documentos."
          action={
            <LinkButton to="/membros/novo" icon={Plus}>
              Cadastrar primeiro membro
            </LinkButton>
          }
        />
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap items-end gap-4">
              <FilterField label="Buscar" htmlFor="busca">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="busca"
                    placeholder="Nome ou CIM"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </FilterField>
              <FilterField label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as MembroStatus | '')}
                >
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </Select>
              </FilterField>
            </div>
          </Card>

          <p className="mb-3 text-sm text-slate-500">
            {membrosFiltrados?.length ?? 0} membro(s) encontrado(s)
          </p>

          {!membrosFiltrados || membrosFiltrados.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhum membro encontrado"
              description="Ajuste a busca ou o filtro de status para ver outros resultados."
            />
          ) : (
            <DataTable
              rowKey={(m) => m.id}
              rows={membrosFiltrados}
              onRowClick={(m) => navigate(`/membros/${m.id}`)}
              columns={[
                {
                  header: 'Membro',
                  render: (m) => (
                    <Link
                      to={`/membros/${m.id}`}
                      title="Ver cobranças do membro"
                      className="font-medium text-slate-900 no-underline hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      {m.nome}
                    </Link>
                  ),
                },
                { header: 'CIM', render: (m) => m.cim },
                {
                  header: 'Status',
                  render: (m) => (
                    <button
                      type="button"
                      onClick={() => setConfirmingMember(m)}
                      disabled={statusUpdatingIds.has(m.id)}
                      title={m.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                      aria-label={`${m.status === 'ATIVO' ? 'Desativar' : 'Ativar'} ${m.nome}`}
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <StatusBadge status={m.status} />
                    </button>
                  ),
                },
                {
                  header: 'Ações',
                  width: '9.5rem',
                  render: (m) => (
                    <div className="flex justify-center gap-1">
                      <IconButton
                        icon={Eye}
                        size="md"
                        aria-label={`Ver membro ${m.nome}`}
                        title="Ver membro"
                        onClick={() => navigate(`/membros/${m.id}`)}
                      />
                      <IconButton
                        icon={Pencil}
                        size="md"
                        aria-label={`Editar ${m.nome}`}
                        title="Editar"
                        onClick={() => navigate(`/membros/${m.id}/editar`)}
                      />
                      <IconButton
                        icon={FileText}
                        size="md"
                        aria-label={`Ver documento de ${m.nome}`}
                        title="Ver documento"
                        onClick={() => navigate(`/documentos?membro_id=${m.id}`)}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmingMember !== null}
        title={confirmingMember?.status === 'ATIVO' ? 'Inativar membro' : 'Ativar membro'}
        confirmLabel={confirmingMember?.status === 'ATIVO' ? 'Inativar' : 'Ativar'}
        confirmDisabled={confirmingMember ? statusUpdatingIds.has(confirmingMember.id) : false}
        destructive={confirmingMember?.status === 'ATIVO'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setConfirmingMember(null)}
      >
        <p>
          Deseja realmente {confirmingMember?.status === 'ATIVO' ? 'inativar' : 'ativar'} o membro{' '}
          <strong>{confirmingMember?.nome}</strong>?
        </p>
      </ConfirmDialog>
    </>
  );
}
