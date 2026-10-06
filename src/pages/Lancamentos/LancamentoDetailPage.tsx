import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { lancamentosApi } from '../../api/lancamentos';
import { extractErrorMessage } from '../../api/client';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DescriptionList,
  ErrorState,
  LinkButton,
  OrigemLancamentoBadge,
  PageHeader,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { LANCAMENTO_ORIGEM_ORIENTACAO, type Lancamento } from '../../types/lancamento';
import { formatCurrency, formatDataBr, formatMesAno } from '../../utils/formatters';

const SUCCESS_MESSAGES: Record<string, string> = {
  criado: 'Lançamento cadastrado com sucesso.',
  atualizado: 'Lançamento atualizado com sucesso.',
};

export default function LancamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [lancamento, setLancamento] = useState<Lancamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const successKey = (location.state as { sucesso?: string } | null)?.sucesso ?? null;

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    lancamentosApi
      .get(Number(id))
      .then(setLancamento)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleDelete() {
    if (!lancamento) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await lancamentosApi.remove(lancamento.id);
      navigate('/lancamentos', {
        state: { sucesso: 'excluido', competencia: lancamento.competencia },
      });
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Lançamento" />
        <SkeletonCard />
      </>
    );
  }

  if (error || !lancamento) {
    return (
      <>
        <PageHeader title="Lançamento" />
        <ErrorState message={error ?? 'Lançamento não encontrado.'} onRetry={load} />
        <div className="mt-4">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/lancamentos')}>
            Voltar para Lançamentos
          </Button>
        </div>
      </>
    );
  }

  // Lançamento automático não é editado nem excluído avulso (o servidor
  // responde 409; o tratamento do erro abaixo continua como rede de segurança).
  const manual = lancamento.origem === 'MANUAL';

  return (
    <>
      <PageHeader title="Lançamento" />
      {lancamento.origem !== 'MANUAL' && (
        <Alert variant="info">{LANCAMENTO_ORIGEM_ORIENTACAO[lancamento.origem]}</Alert>
      )}
      {successKey && SUCCESS_MESSAGES[successKey] && (
        <Alert variant="success">{SUCCESS_MESSAGES[successKey]}</Alert>
      )}
      {deleteError && <Alert variant="error">{deleteError}</Alert>}
      <Card>
        <DescriptionList
          className="mb-6"
          items={[
            {
              label: 'Tipo',
              value: (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge variant={lancamento.tipo === 'RECEITA' ? 'success' : 'danger'}>
                    {lancamento.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
                  </Badge>
                  <OrigemLancamentoBadge origem={lancamento.origem} />
                </span>
              ),
            },
            { label: 'Categoria', value: lancamento.categoria },
            { label: 'Descrição', value: lancamento.descricao || '-' },
            { label: 'Valor', value: formatCurrency(lancamento.valor) },
            { label: 'Data', value: formatDataBr(lancamento.data) },
            { label: 'Competência', value: formatMesAno(lancamento.competencia) },
            { label: 'Observação', value: lancamento.observacao || '-' },
          ]}
        />
        <div className="flex gap-3">
          {manual && (
            <>
              <LinkButton to={`/lancamentos/${lancamento.id}/editar`} icon={Pencil}>
                Editar
              </LinkButton>
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                Excluir
              </Button>
            </>
          )}
          <LinkButton
            to="/lancamentos"
            state={{ competencia: lancamento.competencia }}
            variant="ghost"
            icon={ArrowLeft}
          >
            Voltar
          </LinkButton>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir lançamento"
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        confirmDisabled={deleting}
        confirmIcon={Trash2}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.</p>
        <DescriptionList
          className="mt-3"
          items={[
            { label: 'Tipo', value: lancamento.tipo === 'RECEITA' ? 'Receita' : 'Despesa' },
            { label: 'Categoria', value: lancamento.categoria },
            { label: 'Valor', value: formatCurrency(lancamento.valor) },
          ]}
        />
      </ConfirmDialog>
    </>
  );
}
