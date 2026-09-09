import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Pencil, Power, PowerOff } from 'lucide-react';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import {
  Alert,
  Button,
  Card,
  DescriptionList,
  ErrorState,
  LinkButton,
  PageHeader,
  StatusBadge,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { Membro } from '../../types/membro';

const SUCCESS_MESSAGES: Record<string, string> = {
  criado: 'Membro cadastrado com sucesso.',
  atualizado: 'Membro atualizado com sucesso.',
  status: 'Status atualizado com sucesso.',
};

export default function MembroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [membro, setMembro] = useState<Membro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [successKey, setSuccessKey] = useState<string | null>(
    (location.state as { sucesso?: string } | null)?.sucesso ?? null
  );

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    membrosApi
      .get(Number(id))
      .then(setMembro)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleToggleStatus() {
    if (!membro) return;
    setStatusUpdating(true);
    setError(null);
    try {
      const novoStatus = membro.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
      const updated = await membrosApi.updateStatus(membro.id, novoStatus);
      setMembro(updated);
      setSuccessKey('status');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Membro" />
        <SkeletonCard />
      </>
    );
  }

  if (error && !membro) {
    return (
      <>
        <PageHeader title="Membro" />
        <ErrorState message={error} onRetry={load} />
        <div className="mt-4">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/membros')}>
            Voltar para Membros
          </Button>
        </div>
      </>
    );
  }

  if (!membro) return null;

  return (
    <>
      <PageHeader title={membro.nome} description={`CIM ${membro.cim}`} />
      {error && <Alert variant="error">{error}</Alert>}
      {successKey && SUCCESS_MESSAGES[successKey] && (
        <Alert variant="success">{SUCCESS_MESSAGES[successKey]}</Alert>
      )}
      <Card>
        <DescriptionList
          className="mb-6"
          items={[
            { label: 'CIM', value: membro.cim },
            { label: 'Status', value: <StatusBadge status={membro.status} /> },
            { label: 'Telefone', value: membro.telefone || '-' },
            { label: 'E-mail', value: membro.email || '-' },
          ]}
        />

        <div className="flex gap-3 flex-wrap">
          <LinkButton to={`/membros/${membro.id}/editar`} icon={Pencil}>
            Editar membro
          </LinkButton>
          <Button
            variant="secondary"
            icon={membro.status === 'ATIVO' ? PowerOff : Power}
            onClick={handleToggleStatus}
            disabled={statusUpdating}
          >
            {membro.status === 'ATIVO' ? 'Inativar membro' : 'Ativar membro'}
          </Button>
          <LinkButton to={`/documentos?membro_id=${membro.id}`} variant="secondary" icon={Eye}>
            Ver documento
          </LinkButton>
          <LinkButton to="/membros" variant="ghost" icon={ArrowLeft}>
            Voltar
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
