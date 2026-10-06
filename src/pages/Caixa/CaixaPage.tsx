import { useEffect, useState } from 'react';
import { Pencil, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import { caixaApi } from '../../api/caixa';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  PageHeader,
  StatCard,
} from '../../components/ui';
import { SkeletonCard, SkeletonStatCards } from '../../components/ui/Skeleton';
import type { Caixa } from '../../types/caixa';
import { formatCurrency } from '../../utils/formatters';
import SaldoInicialDialog from './SaldoInicialDialog';

const TITULO = 'Caixa';

/**
 * Caixa (conta única) da Loja: saldo atual acumulado de todos os lançamentos
 * mais o saldo inicial. Os valores são sempre buscados ao abrir a tela (o
 * backend recalcula a cada leitura), portanto refletem lançamentos, baixas e
 * pagamentos desfeitos em outras telas.
 */
export default function CaixaPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    caixaApi
      .get(loja.id)
      .then(setCaixa)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [loja, reloadKey]);

  function abrirDialog() {
    setSaveError(null);
    setSucesso(null);
    setDialogOpen(true);
  }

  async function handleSalvarSaldoInicial(saldoInicial: string) {
    if (!loja || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // A resposta já traz o Caixa recalculado com o novo saldo inicial.
      const atualizado = await caixaApi.definirSaldoInicial(loja.id, {
        saldo_inicial: saldoInicial,
      });
      setCaixa(atualizado);
      setDialogOpen(false);
      setSucesso('Saldo inicial atualizado com sucesso.');
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title={TITULO} />
        <SkeletonCard />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title={TITULO} />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title={TITULO} />
        <SemLojaState description="Cadastre a loja antes de acompanhar o caixa." />
      </>
    );
  }

  const saldoNegativo = caixa ? Number(caixa.saldo_atual) < 0 : false;
  const semMovimento =
    caixa !== null &&
    Number(caixa.saldo_inicial) === 0 &&
    Number(caixa.total_receitas) === 0 &&
    Number(caixa.total_despesas) === 0;

  return (
    <>
      <PageHeader
        title={TITULO}
        description="Saldo acumulado da Loja: saldo inicial + receitas − despesas de todos os lançamentos."
        actions={
          caixa ? (
            <Button icon={Pencil} onClick={abrirDialog}>
              Definir saldo inicial
            </Button>
          ) : null
        }
      />

      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : loading || !caixa ? (
        <>
          <SkeletonCard />
          <div className="mt-4">
            <SkeletonStatCards count={3} />
          </div>
        </>
      ) : (
        <>
          {semMovimento && (
            <Alert variant="info">
              Nenhuma movimentação registrada e saldo inicial zerado. Defina o saldo inicial
              com o valor que a Loja tinha em caixa antes do primeiro lançamento.
            </Alert>
          )}

          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Saldo atual
              </p>
              {saldoNegativo && <Badge variant="danger">Saldo negativo</Badge>}
            </div>
            <p
              data-testid="saldo-atual"
              className={`mt-2 mb-0 text-4xl font-semibold tabular-nums ${
                saldoNegativo ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(caixa.saldo_atual)}
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Saldo inicial"
              value={formatCurrency(caixa.saldo_inicial)}
              icon={PiggyBank}
              tone={Number(caixa.saldo_inicial) < 0 ? 'danger' : 'neutral'}
            />
            <StatCard
              label="Total de receitas"
              value={formatCurrency(caixa.total_receitas)}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              label="Total de despesas"
              value={formatCurrency(caixa.total_despesas)}
              icon={TrendingDown}
              tone="danger"
            />
          </div>
        </>
      )}

      {dialogOpen && caixa && (
        <SaldoInicialDialog
          valorAtual={caixa.saldo_inicial}
          submitting={saving}
          error={saveError}
          onConfirm={handleSalvarSaldoInicial}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
