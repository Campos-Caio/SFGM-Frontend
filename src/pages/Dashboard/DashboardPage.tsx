import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, FileBarChart, FilePlus2, Landmark, Plus, RefreshCw, Wallet } from 'lucide-react';
import { caixaApi } from '../../api/caixa';
import { creditosMembroApi } from '../../api/creditosMembro';
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
import type { PrestacaoContas } from '../../types/prestacaoContas';
import type { Caixa } from '../../types/caixa';
import type { SaldoMembro } from '../../types/creditoMembro';
import { formatCurrency } from '../../utils/formatters';
import { paraCentavos, somarValores } from '../../utils/money';
import { BUSINESS_TIME_ZONE, businessHour, currentCompetencia } from '../../utils/businessTime';

/** Quantidade de indicadores da Visão geral (usada também no esqueleto de carregamento). */
const QTD_INDICADORES = 3;

const linkClass = 'font-medium text-blue-700 hover:underline';

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
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Saldos dos irmãos: carregados à parte, para que uma falha deles não
  // derrube os demais indicadores do painel (e vice-versa).
  const [saldos, setSaldos] = useState<SaldoMembro[] | null>(null);
  const [saldosError, setSaldosError] = useState<string | null>(null);
  const [saldosLoading, setSaldosLoading] = useState(true);
  const [saldosKey, setSaldosKey] = useState(0);

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const competencia = currentCompetencia();
    Promise.all([prestacaoContasApi.get(loja.id, competencia), caixaApi.get(loja.id)])
      .then(([prestacaoData, caixaData]) => {
        setPrestacao(prestacaoData);
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
    setSaldosLoading(true);
    creditosMembroApi
      .listSaldos(loja.id)
      .then((data) => {
        if (active) setSaldos(data);
      })
      .catch((err) => {
        if (active) setSaldosError(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setSaldosLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loja, saldosKey]);

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <SkeletonStatCards count={QTD_INDICADORES} />
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

  // Na primeira carga, os saldos entram no mesmo esqueleto dos demais
  // indicadores (o grid aparece de uma vez, sem saltos de layout). Em
  // "Tentar novamente", só o cartão dos saldos mostra "Carregando...".
  const carregandoIndicadores = loading || (saldosLoading && saldosKey === 0);

  const resultadoNegativo = prestacao ? Number(prestacao.resultado) < 0 : false;
  const caixaNegativo = caixa ? Number(caixa.saldo_atual) < 0 : false;
  const totalEmAberto = saldos ? somarValores(saldos.map((s) => s.total_em_aberto)) : '0.00';
  const totalCreditos = saldos ? somarValores(saldos.map((s) => s.total_credito)) : '0.00';
  const qtdDevedores = saldos ? saldos.filter((s) => s.situacao === 'DEVEDOR').length : 0;

  const saldosHint = saldosError ? (
    <>
      Não foi possível carregar.{' '}
      <button type="button" onClick={() => setSaldosKey((k) => k + 1)} className={linkClass}>
        Tentar novamente
      </button>
    </>
  ) : saldos ? (
    <>
      <span className="block">{qtdDevedores} irmão(s) devedor(es)</span>
      {/* Cor neutra de propósito: ainda não foi decidido se o crédito é lido como positivo ou como obrigação da loja. */}
      <span className="block">
        Créditos de irmãos:{' '}
        <span className="font-medium tabular-nums text-slate-700">{formatCurrency(totalCreditos)}</span>
      </span>
    </>
  ) : (
    'Carregando...'
  );

  return (
    <>
      <PageHeader
        title={`${greeting()}, Tesoureiro`}
        description={`${loja.nome} nº ${loja.numero} — ${mesAnoAtualExtenso()}`}
      />

      {carregandoIndicadores ? (
        <SkeletonStatCards count={QTD_INDICADORES} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => setReloadKey((k) => k + 1)}
              className="sm:col-span-2 lg:col-span-2"
            />
          ) : (
            <>
              <StatCard
                label="Saldo do caixa"
                value={formatCurrency(caixa?.saldo_atual)}
                icon={Landmark}
                tone={caixaNegativo ? 'danger' : 'success'}
                hint={caixaNegativo ? 'Saldo negativo' : 'Acumulado de todos os lançamentos'}
                footer={
                  <Link to="/caixa" className={linkClass}>
                    Ver caixa
                  </Link>
                }
              />
              <StatCard
                label="Resultado do mês"
                value={formatCurrency(prestacao?.resultado)}
                icon={Wallet}
                tone={resultadoNegativo ? 'danger' : 'success'}
                hint={
                  <>
                    Receitas{' '}
                    <span className="tabular-nums">{formatCurrency(prestacao?.total_receitas)}</span>
                    {' · '}Despesas{' '}
                    <span className="tabular-nums">{formatCurrency(prestacao?.total_despesas)}</span>
                  </>
                }
                footer={
                  <Link to="/prestacao-contas" className={linkClass}>
                    Ver prestação de contas
                  </Link>
                }
              />
            </>
          )}
          <StatCard
            label="Em aberto (vencido)"
            value={saldos ? formatCurrency(totalEmAberto) : '—'}
            icon={CircleAlert}
            tone={saldos && paraCentavos(totalEmAberto) > 0 ? 'danger' : 'neutral'}
            hint={saldosHint}
            footer={
              <>
                <Link to="/saldos?situacao=DEVEDOR" className={linkClass}>
                  Ver devedores
                </Link>
                <Link to="/saldos" className={linkClass}>
                  Ver saldos
                </Link>
              </>
            }
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
