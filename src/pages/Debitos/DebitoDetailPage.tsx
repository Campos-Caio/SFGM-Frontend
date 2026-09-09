import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { debitosApi } from '../../api/debitos';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { Alert, Button, Card, DescriptionList, ErrorState, LinkButton, PageHeader } from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { DEBITO_TIPO_LABELS, type DebitoMembro } from '../../types/debito';
import { formatCurrency, formatDataBr, formatMesAno } from '../../utils/formatters';

const SUCCESS_MESSAGES: Record<string, string> = {
  criado: 'Débito cadastrado com sucesso.',
  atualizado: 'Débito atualizado com sucesso.',
};

export default function DebitoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [debito, setDebito] = useState<DebitoMembro | null>(null);
  const [membroNome, setMembroNome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const successKey = (location.state as { sucesso?: string } | null)?.sucesso ?? null;

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    debitosApi
      .get(Number(id))
      .then(async (d) => {
        setDebito(d);
        try {
          const membro = await membrosApi.get(d.membro_id);
          setMembroNome(membro.nome);
        } catch {
          setMembroNome('-');
        }
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading) {
    return (
      <>
        <PageHeader title="Débito" />
        <SkeletonCard />
      </>
    );
  }

  if (error || !debito) {
    return (
      <>
        <PageHeader title="Débito" />
        <ErrorState message={error ?? 'Débito não encontrado.'} onRetry={load} />
        <div className="mt-4">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/debitos')}>
            Voltar para Débitos
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Débito de ${membroNome}`} />
      {successKey && SUCCESS_MESSAGES[successKey] && (
        <Alert variant="success">{SUCCESS_MESSAGES[successKey]}</Alert>
      )}
      <Card>
        <DescriptionList
          className="mb-6"
          items={[
            { label: 'Membro', value: membroNome },
            { label: 'Tipo', value: DEBITO_TIPO_LABELS[debito.tipo] },
            { label: 'Descrição', value: debito.descricao || '-' },
            { label: 'Valor', value: formatCurrency(debito.valor) },
            { label: 'Data', value: formatDataBr(debito.data) },
            { label: 'Competência', value: formatMesAno(debito.competencia) },
            { label: 'Observação', value: debito.observacao || '-' },
          ]}
        />
        <div className="flex gap-3">
          <LinkButton to={`/debitos/${debito.id}/editar`} icon={Pencil}>
            Editar
          </LinkButton>
          <LinkButton to="/debitos" variant="ghost" icon={ArrowLeft}>
            Voltar
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
