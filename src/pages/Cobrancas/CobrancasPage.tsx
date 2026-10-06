import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, ChevronDown, ChevronRight, Filter, HandCoins, Undo2, X } from 'lucide-react';
import { debitosApi, type CobrancasFiltro } from '../../api/debitos';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import { SemLojaState } from '../../components/loja/SemLojaState';
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterField,
  IconButton,
  Input,
  PageHeader,
  Select,
  SituacaoBadge,
} from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import {
  DEBITO_TIPO_LABELS,
  type CobrancaLoja,
  type DebitoMembroPagamentoInput,
} from '../../types/debito';
import type { Membro } from '../../types/membro';
import { currentMonthInput } from '../../utils/businessTime';
import { pagamentoInfo } from '../../utils/cobrancas';
import {
  formatCompetenciaExtenso,
  formatCurrency,
  formatDataBr,
  monthInputToCompetencia,
} from '../../utils/formatters';
import { somarValores } from '../../utils/money';
import DesfazerPagamentoDialog from '../Membros/DesfazerPagamentoDialog';
import PagarCobrancaDialog from '../Membros/PagarCobrancaDialog';

/** Situação do filtro: "" = Todas (não envia o parâmetro). PARCIAL só aparece em Todas. */
type SituacaoFiltro = '' | 'ABERTO' | 'PAGO';

/** Valores do formulário de filtros (formato dos inputs). */
interface Filtros {
  /** "YYYY-MM" (input type="month"); "" = todos os meses. */
  competenciaMes: string;
  situacao: SituacaoFiltro;
  /** Id do membro como string; "" = todos. */
  membroId: string;
}

/** Padrão ao abrir a página e ao "Limpar": mês atual (fuso de MS) e Em aberto. */
function filtrosPadrao(): Filtros {
  return { competenciaMes: currentMonthInput(), situacao: 'ABERTO', membroId: '' };
}

function toApiFiltro(f: Filtros): CobrancasFiltro {
  return {
    competencia: f.competenciaMes ? monthInputToCompetencia(f.competenciaMes) : undefined,
    situacao: f.situacao || undefined,
    membro_id: f.membroId ? Number(f.membroId) : undefined,
  };
}

function cobrancaKey(c: CobrancaLoja): string {
  return `${c.membro_id}-${c.competencia}`;
}

/**
 * Tela "Cobranças" (tesouraria): cobranças de todos os irmãos da loja (uma por
 * irmão e competência), com filtros e baixa da cobrança inteira. Situação e
 * totais vêm do servidor; a soma exibida na página é apenas informativa.
 */
export default function CobrancasPage() {
  const { loja, loading: loadingLoja, error: lojaError } = useCurrentStore();
  const canPagar = useCanPagarDebito();
  const [membros, setMembros] = useState<Membro[]>([]);

  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao);
  // Filtros da última busca: usados na mensagem de vazio, no total e para
  // decidir se uma cobrança paga ainda pertence à lista.
  const [aplicados, setAplicados] = useState<Filtros>(filtros);

  const [cobrancas, setCobrancas] = useState<CobrancaLoja[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set());
  // Descarta respostas de buscas anteriores que cheguem fora de ordem.
  const requestId = useRef(0);

  const [pagarAlvo, setPagarAlvo] = useState<CobrancaLoja | null>(null);
  const [pagando, setPagando] = useState(false);
  const [pagarError, setPagarError] = useState<string | null>(null);
  const [desfazerAlvo, setDesfazerAlvo] = useState<CobrancaLoja | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);
  const [desfazerError, setDesfazerError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; texto: string } | null>(
    null
  );

  const membroNomes = useMemo(() => new Map(membros.map((m) => [m.id, m.nome])), [membros]);

  function buscar(f: Filtros) {
    if (!loja) return;
    const id = ++requestId.current;
    setAplicados(f);
    setLoading(true);
    setError(null);
    debitosApi
      .listCobrancas(loja.id, toApiFiltro(f))
      .then((data) => {
        if (id !== requestId.current) return;
        setCobrancas(data);
        setExpandidas(new Set());
      })
      .catch((err) => {
        if (id === requestId.current) setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }

  useEffect(() => {
    if (!loja) {
      setLoading(false);
      return;
    }
    membrosApi.list(loja.id).then(setMembros).catch(() => {});
    buscar(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja]);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    buscar(filtros);
  }

  function handleLimpar() {
    const padrao = filtrosPadrao();
    setFiltros(padrao);
    setFeedback(null);
    buscar(padrao);
  }

  function toggle(key: string) {
    setExpandidas((atual) => {
      const nova = new Set(atual);
      if (nova.has(key)) nova.delete(key);
      else nova.add(key);
      return nova;
    });
  }

  function abrirPagamento(cobranca: CobrancaLoja) {
    setPagarError(null);
    setFeedback(null);
    setPagarAlvo(cobranca);
  }

  async function handleConfirmarPagamento(input: DebitoMembroPagamentoInput) {
    if (!loja || !pagarAlvo || pagando) return;
    const alvo = pagarAlvo;
    setPagando(true);
    setPagarError(null);
    try {
      const resposta = await debitosApi.pagarCobranca(
        loja.id,
        alvo.membro_id,
        alvo.competencia,
        input
      );
      // A resposta não traz o membro: preserva a identificação do item.
      const atualizada: CobrancaLoja = {
        ...resposta,
        membro_id: alvo.membro_id,
        membro_nome: alvo.membro_nome,
      };
      const key = cobrancaKey(alvo);
      const saiDoFiltro = aplicados.situacao !== '' && atualizada.situacao !== aplicados.situacao;
      setPagarAlvo(null);
      setFeedback({
        variant: 'success',
        texto: `Cobrança de ${alvo.membro_nome} de ${formatCompetenciaExtenso(alvo.competencia)} marcada como paga.`,
      });
      setCobrancas((atual) => {
        if (!atual) return atual;
        return saiDoFiltro
          ? atual.filter((c) => cobrancaKey(c) !== key)
          : atual.map((c) => (cobrancaKey(c) === key ? atualizada : c));
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Cobrança/membro não existe mais: a lista está desatualizada.
        setPagarAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        buscar(aplicados);
      } else {
        // 422, 500 e rede: mantém o diálogo aberto com a mensagem.
        setPagarError(extractErrorMessage(err));
      }
    } finally {
      setPagando(false);
    }
  }

  function abrirDesfazer(cobranca: CobrancaLoja) {
    setDesfazerError(null);
    setFeedback(null);
    setDesfazerAlvo(cobranca);
  }

  async function handleConfirmarDesfazer() {
    if (!loja || !desfazerAlvo || desfazendo) return;
    const alvo = desfazerAlvo;
    setDesfazendo(true);
    setDesfazerError(null);
    try {
      const resposta = await debitosApi.desfazerPagamentoCobranca(
        loja.id,
        alvo.membro_id,
        alvo.competencia
      );
      // A resposta não traz o membro: preserva a identificação do item.
      const atualizada: CobrancaLoja = {
        ...resposta,
        membro_id: alvo.membro_id,
        membro_nome: alvo.membro_nome,
      };
      const key = cobrancaKey(alvo);
      const saiDoFiltro = aplicados.situacao !== '' && atualizada.situacao !== aplicados.situacao;
      setDesfazerAlvo(null);
      setFeedback({
        variant: 'success',
        texto: `Pagamento da cobrança de ${alvo.membro_nome} de ${formatCompetenciaExtenso(alvo.competencia)} desfeito.`,
      });
      setCobrancas((atual) => {
        if (!atual) return atual;
        return saiDoFiltro
          ? atual.filter((c) => cobrancaKey(c) !== key)
          : atual.map((c) => (cobrancaKey(c) === key ? atualizada : c));
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setDesfazerAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        buscar(aplicados);
      } else {
        setDesfazerError(extractErrorMessage(err));
      }
    } finally {
      setDesfazendo(false);
    }
  }

  function mensagemVazio(): string {
    let texto = 'Nenhuma cobrança';
    if (aplicados.situacao === 'ABERTO') texto += ' em aberto';
    else if (aplicados.situacao === 'PAGO') texto += ' paga';
    if (aplicados.competenciaMes) {
      texto += ` em ${formatCompetenciaExtenso(monthInputToCompetencia(aplicados.competenciaMes))}`;
    }
    const nome = aplicados.membroId ? membroNomes.get(Number(aplicados.membroId)) : undefined;
    if (nome) texto += ` para ${nome}`;
    return texto;
  }

  if (loadingLoja) {
    return (
      <>
        <PageHeader title="Cobranças" />
        <SkeletonTable columns={4} />
      </>
    );
  }

  if (lojaError) {
    return (
      <>
        <PageHeader title="Cobranças" />
        <ErrorState message={lojaError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Cobranças" />
        <SemLojaState icon={HandCoins} description="Cadastre a loja antes de gerenciar cobranças." />
      </>
    );
  }

  // Com o filtro "Em aberto" o total relevante é o valor ainda a receber
  // (total_em_aberto); nas demais situações, o total das cobranças.
  const somenteEmAberto = aplicados.situacao === 'ABERTO';
  const totalLista = cobrancas
    ? somarValores(cobrancas.map((c) => (somenteEmAberto ? c.total_em_aberto : c.total)))
    : '0.00';

  return (
    <>
      <PageHeader title="Cobranças" description="Cobranças dos irmãos a receber." />

      {feedback && <Alert variant={feedback.variant}>{feedback.texto}</Alert>}

      <Card className="mb-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <FilterField label="Competência" htmlFor="competencia_mes">
            <Input
              id="competencia_mes"
              type="month"
              value={filtros.competenciaMes}
              onChange={(e) => setFiltros((f) => ({ ...f, competenciaMes: e.target.value }))}
            />
          </FilterField>
          <FilterField label="Situação" htmlFor="situacao">
            <Select
              id="situacao"
              value={filtros.situacao}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, situacao: e.target.value as SituacaoFiltro }))
              }
            >
              <option value="ABERTO">Em aberto</option>
              <option value="PAGO">Pagas</option>
              <option value="">Todas</option>
            </Select>
          </FilterField>
          <FilterField label="Irmão" htmlFor="membro_id">
            <Select
              id="membro_id"
              value={filtros.membroId}
              onChange={(e) => setFiltros((f) => ({ ...f, membroId: e.target.value }))}
            >
              <option value="">Todos</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
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

      {error ? (
        <ErrorState message={error} onRetry={() => buscar(aplicados)} />
      ) : loading || cobrancas === null ? (
        <SkeletonTable columns={4} />
      ) : cobrancas.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={mensagemVazio()}
          description="Ajuste os filtros para ver outras cobranças."
        />
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {cobrancas.map((c) => {
              const key = cobrancaKey(c);
              const aberta = expandidas.has(key);
              const headingId = `cobranca-${key}`;
              const panelId = `cobranca-${key}-debitos`;
              const mes = formatCompetenciaExtenso(c.competencia);
              const pagamento = c.situacao === 'PAGO' ? pagamentoInfo(c) : null;
              return (
                <li key={key}>
                  <section
                    aria-labelledby={headingId}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <IconButton
                          type="button"
                          size="sm"
                          icon={aberta ? ChevronDown : ChevronRight}
                          aria-label={`Débitos da cobrança de ${c.membro_nome} de ${mes}`}
                          aria-expanded={aberta}
                          aria-controls={panelId}
                          onClick={() => toggle(key)}
                        />
                        <h2 id={headingId} className="m-0 text-sm font-semibold text-slate-900">
                          <Link
                            to={`/membros/${c.membro_id}`}
                            className="text-slate-900 no-underline hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            {c.membro_nome}
                          </Link>
                          <span className="font-normal text-slate-600"> · {mes}</span>
                        </h2>
                        <SituacaoBadge situacao={c.situacao} />
                        {pagamento && (
                          <span
                            className="text-xs text-slate-500"
                            title={pagamento.registradoEm && `Registrado em ${pagamento.registradoEm}`}
                          >
                            {pagamento.texto}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="m-0 text-sm text-slate-600">
                          Total <strong className="tabular-nums">{formatCurrency(c.total)}</strong>
                          {c.situacao === 'PARCIAL' && (
                            <>
                              {' · '}
                              Em aberto{' '}
                              <strong className="tabular-nums">
                                {formatCurrency(c.total_em_aberto)}
                              </strong>
                            </>
                          )}
                        </p>
                        {canPagar && c.situacao !== 'PAGO' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => abrirPagamento(c)}
                            aria-label={`Marcar como paga a cobrança de ${c.membro_nome} de ${mes}`}
                          >
                            Marcar como paga
                          </Button>
                        )}
                        {canPagar && c.situacao !== 'ABERTO' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Undo2}
                            onClick={() => abrirDesfazer(c)}
                            aria-label={`Desfazer o pagamento da cobrança de ${c.membro_nome} de ${mes}`}
                          >
                            Desfazer pagamento
                          </Button>
                        )}
                      </div>
                    </div>
                    <div id={panelId} hidden={!aberta} className="mt-3">
                      {aberta && (
                        <DataTable
                          rowKey={(d) => d.id}
                          rows={c.debitos}
                          columns={[
                            {
                              header: 'Débito',
                              wrap: true,
                              render: (d) => (
                                <>
                                  {DEBITO_TIPO_LABELS[d.tipo]}
                                  {d.descricao ? ` — ${d.descricao}` : ''}
                                </>
                              ),
                            },
                            { header: 'Data', render: (d) => formatDataBr(d.data) },
                            {
                              header: 'Valor',
                              align: 'right',
                              render: (d) => formatCurrency(d.valor),
                            },
                          ]}
                        />
                      )}
                    </div>
                  </section>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 mb-0 text-right text-sm text-slate-600">
            {cobrancas.length} cobrança(s) · {somenteEmAberto ? 'Total em aberto' : 'Total'}{' '}
            <strong className="tabular-nums text-slate-900">{formatCurrency(totalLista)}</strong>
          </p>
        </>
      )}

      {pagarAlvo && (
        <PagarCobrancaDialog
          key={cobrancaKey(pagarAlvo)}
          cobranca={pagarAlvo}
          submitting={pagando}
          error={pagarError}
          onConfirm={handleConfirmarPagamento}
          onClose={() => setPagarAlvo(null)}
        />
      )}

      {desfazerAlvo && (
        <DesfazerPagamentoDialog
          key={cobrancaKey(desfazerAlvo)}
          cobranca={desfazerAlvo}
          membroNome={desfazerAlvo.membro_nome}
          submitting={desfazendo}
          error={desfazerError}
          onConfirm={handleConfirmarDesfazer}
          onClose={() => setDesfazerAlvo(null)}
        />
      )}
    </>
  );
}
