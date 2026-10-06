import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Scale, X } from 'lucide-react';
import { creditosMembroApi, type SaldosFiltro } from '../../api/creditosMembro';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterField,
  PageHeader,
  Select,
  SituacaoSaldoBadge,
  StatusBadge,
} from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { SaldoMembro, SituacaoSaldo } from '../../types/creditoMembro';
import type { MembroStatus } from '../../types/membro';
import { formatCurrency } from '../../utils/formatters';
import { rotuloSaldo, somarValores } from '../../utils/money';

const TITULO = 'Saldos dos irmãos';
const SITUACOES: SituacaoSaldo[] = ['DEVEDOR', 'CREDOR', 'EM_DIA'];
const STATUS: MembroStatus[] = ['ATIVO', 'INATIVO'];

/** Filtros da tela (valores da URL); "" = todos (o parâmetro não é enviado). */
interface Filtros {
  situacao: SituacaoSaldo | '';
  status: MembroStatus | '';
}

/** Lê os filtros da URL, ignorando valores desconhecidos. */
function filtrosDaUrl(params: URLSearchParams): Filtros {
  const situacao = params.get('situacao') as SituacaoSaldo | null;
  const status = params.get('status') as MembroStatus | null;
  return {
    situacao: situacao && SITUACOES.includes(situacao) ? situacao : '',
    status: status && STATUS.includes(status) ? status : '',
  };
}

function toApiFiltro(f: Filtros): SaldosFiltro {
  return { situacao: f.situacao || undefined, status: f.status || undefined };
}

function mensagemVazio(f: Filtros): string {
  let texto = 'Nenhum irmão';
  if (f.status === 'ATIVO') texto += ' ativo';
  else if (f.status === 'INATIVO') texto += ' inativo';
  if (f.situacao === 'DEVEDOR') texto += ' devedor';
  else if (f.situacao === 'CREDOR') texto += ' com crédito';
  else if (f.situacao === 'EM_DIA') texto += ' em dia';
  return texto;
}

/**
 * Tela "Saldos dos irmãos" (tesouraria): em aberto (vencido), a vencer,
 * crédito e saldo de cada irmão, calculados pelo servidor. Os filtros são
 * aplicados no servidor e ficam na URL (ex.: `/saldos?situacao=DEVEDOR`, usado
 * pelo painel). Os totais da página são apenas informativos.
 */
export default function SaldosPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const aplicados = filtrosDaUrl(searchParams);
  const { situacao: situacaoAplicada, status: statusAplicado } = aplicados;

  const [filtros, setFiltros] = useState<Filtros>(aplicados);
  const [saldos, setSaldos] = useState<SaldoMembro[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Mantém o formulário em sincronia com a URL (ex.: voltar/avançar do navegador).
  useEffect(() => {
    setFiltros({ situacao: situacaoAplicada, status: statusAplicado });
  }, [situacaoAplicada, statusAplicado]);

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    creditosMembroApi
      .listSaldos(loja.id, toApiFiltro({ situacao: situacaoAplicada, status: statusAplicado }))
      .then((data) => {
        if (active) setSaldos(data);
      })
      .catch((err) => {
        if (active) setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loja, situacaoAplicada, statusAplicado, reloadKey]);

  function aplicar(f: Filtros) {
    const params = new URLSearchParams();
    if (f.situacao) params.set('situacao', f.situacao);
    if (f.status) params.set('status', f.status);
    setSearchParams(params);
    // Refaz a busca mesmo se os filtros não mudaram.
    setReloadKey((k) => k + 1);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    aplicar(filtros);
  }

  function handleLimpar() {
    const vazio: Filtros = { situacao: '', status: '' };
    setFiltros(vazio);
    aplicar(vazio);
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title={TITULO} />
        <SkeletonTable columns={6} />
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
        <SemLojaState icon={Scale} description="Cadastre a loja antes de acompanhar os saldos." />
      </>
    );
  }

  let conteudo;
  if (error) {
    conteudo = <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  } else if (loading || saldos === null) {
    conteudo = <SkeletonTable columns={6} />;
  } else if (saldos.length === 0) {
    conteudo = (
      <EmptyState
        icon={Scale}
        title={mensagemVazio(aplicados)}
        description="Ajuste os filtros para ver outros irmãos."
      />
    );
  } else {
    conteudo = (
      <>
        <DataTable
          rowKey={(s) => s.membro_id}
          rows={saldos}
          columns={[
            {
              header: 'Irmão',
              wrap: true,
              render: (s) => (
                <Link
                  to={`/membros/${s.membro_id}`}
                  className="font-medium text-slate-900 no-underline hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {s.membro_nome}
                </Link>
              ),
            },
            { header: 'Status', render: (s) => <StatusBadge status={s.membro_status} /> },
            {
              header: 'Em aberto',
              align: 'right',
              render: (s) => formatCurrency(s.total_em_aberto),
            },
            { header: 'A vencer', align: 'right', render: (s) => formatCurrency(s.total_a_vencer) },
            { header: 'Crédito', align: 'right', render: (s) => formatCurrency(s.total_credito) },
            {
              header: 'Saldo',
              align: 'right',
              render: (s) => (
                <span className="inline-flex items-center gap-2">
                  {rotuloSaldo(s.saldo)}
                  <SituacaoSaldoBadge situacao={s.situacao} />
                </span>
              ),
            },
          ]}
        />
        <p className="mt-4 mb-0 text-right text-sm text-slate-600">
          {saldos.length} irmão(s) · Em aberto{' '}
          <strong className="tabular-nums text-slate-900">
            {formatCurrency(somarValores(saldos.map((s) => s.total_em_aberto)))}
          </strong>{' '}
          · A vencer{' '}
          <strong className="tabular-nums text-slate-900">
            {formatCurrency(somarValores(saldos.map((s) => s.total_a_vencer)))}
          </strong>{' '}
          · Crédito{' '}
          <strong className="tabular-nums text-slate-900">
            {formatCurrency(somarValores(saldos.map((s) => s.total_credito)))}
          </strong>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={TITULO}
        description="Quem deve (cobranças vencidas em aberto) e quem tem crédito adiantado."
      />

      <Card className="mb-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <FilterField label="Situação" htmlFor="saldo_situacao">
            <Select
              id="saldo_situacao"
              value={filtros.situacao}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, situacao: e.target.value as Filtros['situacao'] }))
              }
            >
              <option value="">Todas</option>
              <option value="DEVEDOR">Devedores</option>
              <option value="CREDOR">Credores</option>
              <option value="EM_DIA">Em dia</option>
            </Select>
          </FilterField>
          <FilterField label="Status do irmão" htmlFor="saldo_status">
            <Select
              id="saldo_status"
              value={filtros.status}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, status: e.target.value as Filtros['status'] }))
              }
            >
              <option value="">Todos</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </Select>
          </FilterField>
          <Button type="submit" icon={Filter}>
            Filtrar
          </Button>
          <Button type="button" variant="secondary" icon={X} onClick={handleLimpar}>
            Limpar
          </Button>
        </form>
      </Card>

      {conteudo}
    </>
  );
}
