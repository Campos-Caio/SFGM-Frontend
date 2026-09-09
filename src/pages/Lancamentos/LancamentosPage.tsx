import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, Filter, Pencil, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { lancamentosApi } from '../../api/lancamentos';
import { prestacaoContasApi } from '../../api/prestacaoContas';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterField,
  Input,
  LinkButton,
  PageHeader,
  Select,
  StatCard,
} from '../../components/ui';
import { SkeletonStatCards, SkeletonTable } from '../../components/ui/Skeleton';
import type { Lancamento, LancamentoTipo } from '../../types/lancamento';
import type { PrestacaoContas } from '../../types/prestacaoContas';
import {
  competenciaToMonthInput,
  formatCurrency,
  monthInputToCompetencia,
} from '../../utils/formatters';

/** "YYYY-MM" do mês atual, usado como competência padrão ao abrir a tela. */
function currentMonthInput(): string {
  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mes}`;
}

const SUCCESS_MESSAGES: Record<string, string> = {
  excluido: 'Lançamento excluído com sucesso.',
};

/** Tela de Lançamentos: filtros, indicadores (KPIs) e a tabela de lançamentos da competência. */
export default function LancamentosPage() {
  const location = useLocation();
  const state = location.state as { sucesso?: string; competencia?: string } | null;
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();

  const [competenciaMes, setCompetenciaMes] = useState('');

  const [prestacao, setPrestacao] = useState<PrestacaoContas | null>(null);
  const [loadingPrestacao, setLoadingPrestacao] = useState(false);

  const [tipo, setTipo] = useState('');
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [lancamentosError, setLancamentosError] = useState<string | null>(null);

  function loadPrestacao(lojaId: number, mes: string) {
    if (!mes) return;
    setLoadingPrestacao(true);
    prestacaoContasApi
      .get(lojaId, monthInputToCompetencia(mes))
      .then(setPrestacao)
      .catch(() => setPrestacao(null))
      .finally(() => setLoadingPrestacao(false));
  }

  function loadLancamentos(lojaId: number, mes: string, tipoFiltro: string) {
    setLoadingLancamentos(true);
    setLancamentosError(null);
    lancamentosApi
      .listByLoja(lojaId, {
        competencia: mes ? monthInputToCompetencia(mes) : undefined,
        tipo: (tipoFiltro as LancamentoTipo) || undefined,
      })
      .then(setLancamentos)
      .catch((err) => setLancamentosError(extractErrorMessage(err)))
      .finally(() => setLoadingLancamentos(false));
  }

  useEffect(() => {
    if (!loja) return;
    const mesInicial = state?.competencia
      ? competenciaToMonthInput(state.competencia)
      : currentMonthInput();
    setCompetenciaMes(mesInicial);
    loadPrestacao(loja.id, mesInicial);
    loadLancamentos(loja.id, mesInicial, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja]);

  const loadingFiltro = loadingPrestacao || loadingLancamentos;

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    if (!loja || !competenciaMes) return;
    loadPrestacao(loja.id, competenciaMes);
    loadLancamentos(loja.id, competenciaMes, tipo);
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Lançamentos" />
        <SkeletonStatCards />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Lançamentos" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Lançamentos" />
        <EmptyState
          title="Nenhuma loja cadastrada no sistema"
          description="Cadastre a loja antes de gerenciar lançamentos."
        />
      </>
    );
  }

  const resultadoNegativo = prestacao ? Number(prestacao.resultado) < 0 : false;

  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="Registre receitas e despesas da Loja."
        actions={
          <LinkButton to="/lancamentos/novo" icon={Plus}>
            Novo lançamento
          </LinkButton>
        }
      />
      {state?.sucesso && SUCCESS_MESSAGES[state.sucesso] && (
        <Alert variant="success">{SUCCESS_MESSAGES[state.sucesso]}</Alert>
      )}

      <Card className="mb-6">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <FilterField label="Competência" htmlFor="competencia_mes">
            <Input
              id="competencia_mes"
              type="month"
              value={competenciaMes}
              onChange={(e) => setCompetenciaMes(e.target.value)}
              required
            />
          </FilterField>
          <FilterField label="Tipo" htmlFor="tipo">
            <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
            </Select>
          </FilterField>
          <Button type="submit" icon={Filter} disabled={loadingFiltro}>
            {loadingFiltro ? 'Carregando...' : 'Filtrar'}
          </Button>
        </form>
      </Card>

      {loadingPrestacao ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          <StatCard label="Receitas" value={formatCurrency(prestacao?.total_receitas)} icon={TrendingUp} tone="success" />
          <StatCard label="Despesas" value={formatCurrency(prestacao?.total_despesas)} icon={TrendingDown} tone="danger" />
          <StatCard
            label="Resultado"
            value={formatCurrency(prestacao?.resultado)}
            icon={Wallet}
            tone={resultadoNegativo ? 'danger' : 'success'}
          />
        </div>
      )}

      <h2 className="mb-3 text-base font-semibold text-slate-900">Lançamentos</h2>

      {lancamentosError ? (
        <ErrorState
          message={lancamentosError}
          onRetry={() => loadLancamentos(loja.id, competenciaMes, tipo)}
        />
      ) : loadingLancamentos ? (
        <SkeletonTable columns={4} />
      ) : !lancamentos || lancamentos.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento encontrado"
          description="Ajuste os filtros ou use o botão “Novo lançamento” no topo da página para registrar um."
        />
      ) : (
        <DataTable
          rowKey={(l) => l.id}
          rows={lancamentos}
          columns={[
            {
              header: 'Tipo',
              render: (l) => (
                <Badge variant={l.tipo === 'RECEITA' ? 'success' : 'danger'}>
                  {l.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}
                </Badge>
              ),
            },
            { header: 'Categoria', render: (l) => l.categoria },
            { header: 'Descrição', wrap: true, render: (l) => l.descricao || '-' },
            { header: 'Valor', align: 'right', render: (l) => formatCurrency(l.valor) },
            {
              header: 'Ações',
              align: 'right',
              render: (l) => (
                <div className="flex justify-end gap-1">
                  <LinkButton to={`/lancamentos/${l.id}`} variant="secondary" size="sm" icon={Eye}>
                    Ver
                  </LinkButton>
                  <LinkButton to={`/lancamentos/${l.id}/editar`} variant="secondary" size="sm" icon={Pencil}>
                    Editar
                  </LinkButton>
                </div>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
