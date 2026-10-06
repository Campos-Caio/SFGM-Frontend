import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, PiggyBank, Receipt, Undo2 } from 'lucide-react';
import { debitosApi } from '../../api/debitos';
import { extractErrorMessage } from '../../api/client';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  SituacaoBadge,
} from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import {
  DEBITO_TIPO_LABELS,
  type DebitoMembroPagamentoInput,
  type DebitosPorCompetencia,
  type PagarComCreditoInput,
} from '../../types/debito';
import { currentCompetencia } from '../../utils/businessTime';
import { pagamentoInfo } from '../../utils/cobrancas';
import { formatCompetenciaExtenso, formatCurrency, formatDataBr } from '../../utils/formatters';
import { compararValores, paraCentavos } from '../../utils/money';
import DesfazerPagamentoDialog from './DesfazerPagamentoDialog';
import PagarCobrancaDialog from './PagarCobrancaDialog';
import PagarComCreditoDialog from './PagarComCreditoDialog';

interface DebitosPorCompetenciaSectionProps {
  lojaId: number;
  membroId: number;
  /** Crédito disponível do irmão (`null` enquanto o saldo não carregou ou falhou). */
  creditoDisponivel: string | null;
  /** Muda a cada ação financeira na ficha: recarrega as cobranças. */
  versao: number;
  /** Avisa a ficha que algo mudou (recarrega saldo, extrato e cobranças). */
  onAlterado: () => void;
}

/** 404/409: o estado mudou no servidor (cobrança removida, crédito insuficiente etc.). */
function isEstadoDesatualizado(err: unknown): boolean {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  return status === 404 || status === 409;
}

/**
 * Seção "Cobranças" da tela do membro: uma cobrança por competência (mês) =
 * soma de todos os débitos do mês, com uma única situação (Em aberto / Pago).
 * A situação e os totais são calculados pelo servidor; a baixa é da cobrança
 * inteira (tudo-ou-nada), nunca de um débito isolado — em dinheiro ou com o
 * crédito do irmão (quando ele cobre todo o valor em aberto).
 */
export default function DebitosPorCompetenciaSection({
  lojaId,
  membroId,
  creditoDisponivel,
  versao,
  onAlterado,
}: DebitosPorCompetenciaSectionProps) {
  const canPagar = useCanPagarDebito();
  const [cobrancas, setCobrancas] = useState<DebitosPorCompetencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [pagarAlvo, setPagarAlvo] = useState<DebitosPorCompetencia | null>(null);
  const [pagando, setPagando] = useState(false);
  const [pagarError, setPagarError] = useState<string | null>(null);
  const [pagarCreditoAlvo, setPagarCreditoAlvo] = useState<DebitosPorCompetencia | null>(null);
  const [pagandoCredito, setPagandoCredito] = useState(false);
  const [pagarCreditoError, setPagarCreditoError] = useState<string | null>(null);
  const [desfazerAlvo, setDesfazerAlvo] = useState<DebitosPorCompetencia | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);
  const [desfazerError, setDesfazerError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; texto: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;
    debitosApi
      .listPorCompetencia(lojaId, membroId)
      .then((data) => {
        if (!active) return;
        setCobrancas(data);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(extractErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [lojaId, membroId, reloadKey, versao]);

  function handleRetry() {
    setError(null);
    setReloadKey((k) => k + 1);
  }

  function abrirPagamento(cobranca: DebitosPorCompetencia) {
    setPagarError(null);
    setFeedback(null);
    setPagarAlvo(cobranca);
  }

  async function handleConfirmarPagamento(input: DebitoMembroPagamentoInput) {
    if (!pagarAlvo || pagando) return;
    const alvo = pagarAlvo;
    setPagando(true);
    setPagarError(null);
    try {
      const atualizada = await debitosApi.pagarCobranca(lojaId, membroId, alvo.competencia, input);
      setPagarAlvo(null);
      setFeedback({
        variant: 'success',
        texto: `Cobrança de ${formatCompetenciaExtenso(alvo.competencia)} marcada como paga.`,
      });
      // A resposta já é a cobrança do mês completa e atualizada (mesmo formato
      // do item da lista): substitui-a no estado de imediato; a ficha recarrega
      // saldo, extrato e cobranças em seguida.
      substituirCobranca(atualizada);
      onAlterado();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Cobrança/membro não existe mais: a lista está desatualizada.
        setPagarAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        onAlterado();
      } else {
        // 422, 500 e rede: mantém o diálogo aberto com a mensagem.
        setPagarError(extractErrorMessage(err));
      }
    } finally {
      setPagando(false);
    }
  }

  function substituirCobranca(atualizada: DebitosPorCompetencia) {
    setCobrancas((atual) =>
      atual ? atual.map((c) => (c.competencia === atualizada.competencia ? atualizada : c)) : atual
    );
  }

  function abrirPagamentoCredito(cobranca: DebitosPorCompetencia) {
    setPagarCreditoError(null);
    setFeedback(null);
    setPagarCreditoAlvo(cobranca);
  }

  async function handleConfirmarPagamentoCredito(input: PagarComCreditoInput) {
    if (!pagarCreditoAlvo || pagandoCredito) return;
    const alvo = pagarCreditoAlvo;
    setPagandoCredito(true);
    setPagarCreditoError(null);
    try {
      const atualizada = await debitosApi.pagarCobrancaComCredito(
        lojaId,
        membroId,
        alvo.competencia,
        input
      );
      setPagarCreditoAlvo(null);
      setFeedback({
        variant: 'success',
        texto: `Cobrança de ${formatCompetenciaExtenso(alvo.competencia)} paga com o crédito do irmão.`,
      });
      substituirCobranca(atualizada);
      onAlterado();
    } catch (err) {
      if (isEstadoDesatualizado(err)) {
        // 409 (crédito insuficiente) ou 404: os dados da ficha estão
        // desatualizados. Fecha, avisa e recarrega saldo/extrato/cobranças.
        setPagarCreditoAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        onAlterado();
      } else {
        // 422, 500 e rede: mantém o diálogo aberto com a mensagem.
        setPagarCreditoError(extractErrorMessage(err));
      }
    } finally {
      setPagandoCredito(false);
    }
  }

  function abrirDesfazer(cobranca: DebitosPorCompetencia) {
    setDesfazerError(null);
    setFeedback(null);
    setDesfazerAlvo(cobranca);
  }

  async function handleConfirmarDesfazer() {
    if (!desfazerAlvo || desfazendo) return;
    const alvo = desfazerAlvo;
    setDesfazendo(true);
    setDesfazerError(null);
    try {
      const atualizada = await debitosApi.desfazerPagamentoCobranca(
        lojaId,
        membroId,
        alvo.competencia
      );
      setDesfazerAlvo(null);
      setFeedback({
        variant: 'success',
        texto: `Pagamento da cobrança de ${formatCompetenciaExtenso(alvo.competencia)} desfeito.`,
      });
      substituirCobranca(atualizada);
      // Pode ter devolvido crédito ao irmão: recarrega saldo e extrato também.
      onAlterado();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setDesfazerAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        onAlterado();
      } else {
        setDesfazerError(extractErrorMessage(err));
      }
    } finally {
      setDesfazendo(false);
    }
  }

  let content;
  if (cobrancas === null) {
    content = error ? (
      <ErrorState message={error} onRetry={handleRetry} />
    ) : (
      <SkeletonTable columns={3} rows={3} />
    );
  } else if (cobrancas.length === 0) {
    content = (
      <EmptyState
        icon={Receipt}
        title="Nenhuma cobrança para este irmão"
        description="Os débitos lançados para o irmão aparecerão aqui, agrupados por competência."
      />
    );
  } else {
    // Datas "YYYY-MM-DD" comparam corretamente como string.
    const competenciaAtual = currentCompetencia();
    content = (
      <>
        {error && (
          <Alert variant="error">
            {error}{' '}
            <Button variant="secondary" size="sm" onClick={handleRetry} className="ml-2">
              Tentar novamente
            </Button>
          </Alert>
        )}
        <div className="flex flex-col gap-6">
          {cobrancas.map((c) => {
            const headingId = `cobranca-${c.competencia}`;
            const pagamento = c.situacao === 'PAGO' ? pagamentoInfo(c) : null;
            // Competência futura em aberto ainda não é dívida (não entra no "em aberto" do saldo).
            const aVencer = c.situacao !== 'PAGO' && c.competencia > competenciaAtual;
            // Pagar com crédito: só quando o crédito cobre todo o valor em aberto
            // (o servidor não aceita pagamento parcial e revalida, com 409).
            const creditoCobre =
              creditoDisponivel !== null &&
              paraCentavos(creditoDisponivel) > 0 &&
              compararValores(creditoDisponivel, c.total_em_aberto) >= 0;
            return (
              <section key={c.competencia} aria-labelledby={headingId}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 id={headingId} className="m-0 text-sm font-semibold text-slate-900">
                      Cobrança de {formatCompetenciaExtenso(c.competencia)}
                    </h4>
                    <SituacaoBadge situacao={c.situacao} />
                    {aVencer && <Badge variant="info">A vencer</Badge>}
                    {pagamento && (
                      <span className="text-xs text-slate-500" title={pagamento.registradoEm && `Registrado em ${pagamento.registradoEm}`}>
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
                          <strong className="tabular-nums">{formatCurrency(c.total_em_aberto)}</strong>
                        </>
                      )}
                    </p>
                    {canPagar && c.situacao !== 'PAGO' && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => abrirPagamento(c)}
                      >
                        Marcar cobrança como paga
                      </Button>
                    )}
                    {canPagar && c.situacao !== 'PAGO' && creditoCobre && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={PiggyBank}
                        onClick={() => abrirPagamentoCredito(c)}
                      >
                        Pagar com crédito
                      </Button>
                    )}
                    {canPagar && c.situacao !== 'ABERTO' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Undo2}
                        onClick={() => abrirDesfazer(c)}
                      >
                        Desfazer pagamento
                      </Button>
                    )}
                  </div>
                </div>
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
                    { header: 'Valor', align: 'right', render: (d) => formatCurrency(d.valor) },
                  ]}
                />
              </section>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Cobranças"
        description="Soma dos débitos lançados para este irmão em cada mês, com a situação de pagamento."
      />
      {feedback && <Alert variant={feedback.variant}>{feedback.texto}</Alert>}
      {content}

      {pagarAlvo && (
        <PagarCobrancaDialog
          key={pagarAlvo.competencia}
          cobranca={pagarAlvo}
          submitting={pagando}
          error={pagarError}
          onConfirm={handleConfirmarPagamento}
          onClose={() => setPagarAlvo(null)}
        />
      )}

      {pagarCreditoAlvo && creditoDisponivel !== null && (
        <PagarComCreditoDialog
          key={pagarCreditoAlvo.competencia}
          cobranca={pagarCreditoAlvo}
          creditoDisponivel={creditoDisponivel}
          submitting={pagandoCredito}
          error={pagarCreditoError}
          onConfirm={handleConfirmarPagamentoCredito}
          onClose={() => setPagarCreditoAlvo(null)}
        />
      )}

      {desfazerAlvo && (
        <DesfazerPagamentoDialog
          key={desfazerAlvo.competencia}
          cobranca={desfazerAlvo}
          submitting={desfazendo}
          error={desfazerError}
          onConfirm={handleConfirmarDesfazer}
          onClose={() => setDesfazerAlvo(null)}
        />
      )}
    </Card>
  );
}
