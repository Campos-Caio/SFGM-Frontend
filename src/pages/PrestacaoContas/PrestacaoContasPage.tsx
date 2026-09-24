import { useEffect, useState, type FormEvent } from 'react';
import { Filter, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  FilterField,
  Input,
  PageHeader,
  StatCard,
} from '../../components/ui';
import { SkeletonCard, SkeletonStatCards } from '../../components/ui/Skeleton';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import { formatCurrency, formatMesAno, monthInputToCompetencia } from '../../utils/formatters';
import { currentMonthInput } from '../../utils/businessTime';

function CategoriaTable({
  items,
  total,
  emptyMessage,
}: {
  items: PrestacaoContas['receitas'];
  total: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <Alert variant="info" className="mb-0">
        {emptyMessage} Total: <strong>{formatCurrency(total)}</strong>
      </Alert>
    );
  }
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {items.map((item, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-b-0">
            <td className="py-2 text-slate-700">{item.categoria}</td>
            <td className="py-2 text-right tabular-nums text-slate-700">{formatCurrency(item.valor)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-slate-800 font-semibold">
          <td className="py-2 text-slate-900">Total</td>
          <td className="py-2 text-right tabular-nums text-slate-900">{formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export default function PrestacaoContasPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [competenciaMes, setCompetenciaMes] = useState('');
  const [prestacao, setPrestacao] = useState<PrestacaoContas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  function load(lojaId: number, mes: string) {
    if (!mes) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    prestacaoContasApi
      .get(lojaId, monthInputToCompetencia(mes))
      .then(setPrestacao)
      .catch((err) => {
        setPrestacao(null);
        setError(extractErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!loja) return;
    const mesInicial = currentMonthInput();
    setCompetenciaMes(mesInicial);
    load(loja.id, mesInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!loja || !competenciaMes) return;
    load(loja.id, competenciaMes);
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Prestação de contas" />
        <SkeletonCard />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Prestação de contas" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Prestação de contas" />
        <SemLojaState
          description="Cadastre a loja antes de consultar a prestação de contas."
        />
      </>
    );
  }

  const resultadoNegativo = prestacao ? Number(prestacao.resultado) < 0 : false;

  return (
    <>
      <PageHeader
        title="Prestação de contas"
        description="Receitas, despesas e resultado da Loja por competência."
      />

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <FilterField label="Competência" htmlFor="competencia_mes">
            <Input
              id="competencia_mes"
              type="month"
              value={competenciaMes}
              onChange={(e) => setCompetenciaMes(e.target.value)}
              required
            />
          </FilterField>
          <Button type="submit" icon={Filter} disabled={loading}>
            {loading ? 'Carregando...' : 'Filtrar'}
          </Button>
        </form>
      </Card>

      {error && <ErrorState message={error} onRetry={() => loja && load(loja.id, competenciaMes)} />}

      {!error && loading && <SkeletonStatCards />}

      {!error && !loading && searched && !prestacao && (
        <EmptyState title="Nenhum resultado encontrado" description="Não há dados de prestação de contas para a competência selecionada." />
      )}

      {!error && !loading && prestacao && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <StatCard label="Receitas" value={formatCurrency(prestacao.total_receitas)} icon={TrendingUp} tone="success" />
            <StatCard label="Despesas" value={formatCurrency(prestacao.total_despesas)} icon={TrendingDown} tone="danger" />
            <StatCard
              label="Resultado"
              value={formatCurrency(prestacao.resultado)}
              icon={Wallet}
              tone={resultadoNegativo ? 'danger' : 'success'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Receitas" description={`Competência ${formatMesAno(prestacao.competencia)}`} />
              <CategoriaTable
                items={prestacao.receitas}
                total={prestacao.total_receitas}
                emptyMessage="Nenhuma receita registrada."
              />
            </Card>
            <Card>
              <CardHeader title="Despesas" description={`Competência ${formatMesAno(prestacao.competencia)}`} />
              <CategoriaTable
                items={prestacao.despesas}
                total={prestacao.total_despesas}
                emptyMessage="Nenhuma despesa registrada."
              />
            </Card>
          </div>
        </>
      )}
    </>
  );
}
