import { useEffect, useState } from 'react';
import { FileBarChart, FilePlus2, Plus, Receipt, RefreshCw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { debitosApi } from '../../api/debitos';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  StatCard,
} from '../../components/ui';
import { SkeletonStatCards } from '../../components/ui/Skeleton';
import type { DebitoMembro } from '../../types/debito';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import { formatCurrency } from '../../utils/formatters';

/** "YYYY-MM-01" da competência atual. */
function currentCompetencia(): string {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mes}-01`;
}

function greeting(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function mesAnoAtualExtenso(): string {
  const texto = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DashboardPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();

  const [prestacao, setPrestacao] = useState<PrestacaoContas | null>(null);
  const [debitos, setDebitos] = useState<DebitoMembro[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const competencia = currentCompetencia();
    Promise.all([
      prestacaoContasApi.get(loja.id, competencia),
      debitosApi.listByLoja(loja.id, { competencia }),
    ])
      .then(([prestacaoData, debitosData]) => {
        setPrestacao(prestacaoData);
        setDebitos(debitosData);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [loja, reloadKey]);

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <SkeletonStatCards />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <EmptyState
          title="Nenhuma loja cadastrada no sistema"
          description="Cadastre a loja antes de acompanhar os indicadores de tesouraria."
        />
      </>
    );
  }

  const valorDebitos = debitos ? debitos.reduce((soma, d) => soma + Number(d.valor), 0) : 0;
  const resultadoNegativo = prestacao ? Number(prestacao.resultado) < 0 : false;

  return (
    <>
      <PageHeader
        title={`${greeting()}, Tesoureiro`}
        description={`${loja.nome} nº ${loja.numero} — ${mesAnoAtualExtenso()}`}
      />

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : loading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Receitas do mês"
            value={formatCurrency(prestacao?.total_receitas)}
            icon={TrendingUp}
            tone="success"
          />
          <StatCard
            label="Despesas do mês"
            value={formatCurrency(prestacao?.total_despesas)}
            icon={TrendingDown}
            tone="danger"
          />
          <StatCard
            label="Resultado do mês"
            value={formatCurrency(prestacao?.resultado)}
            icon={Wallet}
            tone={resultadoNegativo ? 'danger' : 'success'}
          />
          <StatCard
            label="Débitos do mês"
            value={debitos ? debitos.length : 0}
            icon={Receipt}
            tone="neutral"
            hint={`Total lançado: ${formatCurrency(valorDebitos)}`}
          />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Ações rápidas" description="Atalhos para as tarefas mais comuns da tesouraria." />
        <div className="flex flex-wrap gap-3">
          <LinkButton to="/lancamentos/novo" icon={Plus}>
            Novo lançamento
          </LinkButton>
          <LinkButton to="/debitos/novo" variant="secondary" icon={Plus}>
            Novo débito
          </LinkButton>
          <LinkButton to="/debitos" state={{ abrirModalMensalidades: true }} variant="secondary" icon={RefreshCw}>
            Gerar mensalidades
          </LinkButton>
          <LinkButton to="/documentos" variant="secondary" icon={FilePlus2}>
            Emitir documento
          </LinkButton>
          <LinkButton to="/prestacao-contas" variant="ghost" icon={FileBarChart}>
            Ver prestação de contas
          </LinkButton>
        </div>
      </Card>
    </>
  );
}
