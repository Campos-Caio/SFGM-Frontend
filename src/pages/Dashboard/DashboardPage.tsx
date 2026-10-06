import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, FileBarChart, FilePlus2, Landmark, PiggyBank, Plus, Receipt, RefreshCw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { caixaApi } from '../../api/caixa';
import { creditosMembroApi } from '../../api/creditosMembro';
import { debitosApi } from '../../api/debitos';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Card,
  CardHeader,
  ErrorState,
  LinkButton,
  PageHeader,
  StatCard,
} from '../../components/ui';
import { SkeletonStatCards } from '../../components/ui/Skeleton';
import type { DebitoMembro } from '../../types/debito';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import type { Caixa } from '../../types/caixa';
import type { SaldoMembro } from '../../types/creditoMembro';
import { formatCurrency } from '../../utils/formatters';
import { paraCentavos, somarValores } from '../../utils/money';
import { BUSINESS_TIME_ZONE, businessHour, currentCompetencia } from '../../utils/businessTime';

function greeting(): string {
  const hora = businessHour();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function mesAnoAtualExtenso(): string {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DashboardPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();

  const [prestacao, setPrestacao] = useState<PrestacaoContas | null>(null);
  const [debitos, setDebitos] = useState<DebitoMembro[] | null>(null);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Saldos dos irmãos: carregados à parte, para que uma falha deles não
  // derrube os demais indicadores do painel (e vice-versa).
  const [saldos, setSaldos] = useState<SaldoMembro[] | null>(null);
  const [saldosError, setSaldosError] = useState<string | null>(null);
  const [saldosKey, setSaldosKey] = useState(0);

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
      caixaApi.get(loja.id),
    ])
      .then(([prestacaoData, debitosData, caixaData]) => {
        setPrestacao(prestacaoData);
        setDebitos(debitosData);
        setCaixa(caixaData);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [loja, reloadKey]);

  useEffect(() => {
    if (!loja) return;
    let active = true;
    setSaldos(null);
    setSaldosError(null);
    creditosMembroApi
      .listSaldos(loja.id)
      .then((data) => {
        if (active) setSaldos(data);
      })
      .catch((err) => {
        if (active) setSaldosError(extractErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [loja, saldosKey]);

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
        <SemLojaState
          description="Cadastre a loja antes de acompanhar os indicadores de tesouraria."
        />
      </>
    );
  }

  const valorDebitos = debitos ? debitos.reduce((soma, d) => soma + Number(d.valor), 0) : 0;
  const resultadoNegativo = prestacao ? Number(prestacao.resultado) < 0 : false;
  const caixaNegativo = caixa ? Number(caixa.saldo_atual) < 0 : false;
  const totalEmAberto = saldos ? somarValores(saldos.map((s) => s.total_em_aberto)) : '0.00';
  const totalCreditos = saldos ? somarValores(saldos.map((s) => s.total_credito)) : '0.00';
  const qtdDevedores = saldos ? saldos.filter((s) => s.situacao === 'DEVEDOR').length : 0;
  const saldosFalhaHint = (
    <>
      Não foi possível carregar.{' '}
      <button
        type="button"
        onClick={() => setSaldosKey((k) => k + 1)}
        className="font-medium text-blue-700 hover:underline"
      >
        Tentar novamente
      </button>
    </>
  );

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
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Saldo do caixa"
              value={formatCurrency(caixa?.saldo_atual)}
              icon={Landmark}
              tone={caixaNegativo ? 'danger' : 'success'}
              hint={
                <>
                  {caixaNegativo ? 'Saldo negativo · ' : 'Acumulado de todos os lançamentos · '}
                  <Link to="/caixa" className="font-medium text-blue-700 hover:underline">
                    Ver caixa
                  </Link>
                </>
              }
            />
          </div>
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
        </>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Em aberto (vencido)"
          value={saldos ? formatCurrency(totalEmAberto) : '—'}
          icon={CircleAlert}
          tone={saldos && paraCentavos(totalEmAberto) > 0 ? 'danger' : 'neutral'}
          hint={
            saldosError ? (
              saldosFalhaHint
            ) : saldos ? (
              <>
                {qtdDevedores} irmão(s) devedor(es) ·{' '}
                <Link
                  to="/saldos?situacao=DEVEDOR"
                  className="font-medium text-blue-700 hover:underline"
                >
                  Ver devedores
                </Link>
              </>
            ) : (
              'Carregando...'
            )
          }
        />
        <StatCard
          label="Créditos de irmãos"
          value={saldos ? formatCurrency(totalCreditos) : '—'}
          icon={PiggyBank}
          tone={saldos && paraCentavos(totalCreditos) > 0 ? 'success' : 'neutral'}
          hint={
            saldosError ? (
              saldosFalhaHint
            ) : saldos ? (
              <>
                Adiantado e ainda não usado ·{' '}
                <Link to="/saldos" className="font-medium text-blue-700 hover:underline">
                  Ver saldos
                </Link>
              </>
            ) : (
              'Carregando...'
            )
          }
        />
      </div>

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
