import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Receipt } from 'lucide-react';
import { debitosApi } from '../../api/debitos';
import { extractErrorMessage } from '../../api/client';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import {
  Alert,
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
  FORMA_PAGAMENTO_LABELS,
  type DebitoMembroPagamentoInput,
  type DebitosPorCompetencia,
} from '../../types/debito';
import { businessDateFromTimestamp, formatDateTimeBr } from '../../utils/businessTime';
import { formatCompetenciaExtenso, formatCurrency, formatDataBr } from '../../utils/formatters';
import PagarCobrancaDialog from './PagarCobrancaDialog';

interface DebitosPorCompetenciaSectionProps {
  lojaId: number;
  membroId: number;
}

/**
 * Texto da baixa de uma cobrança paga: "Pago em DD/MM/AAAA · Forma". Usa a data
 * efetiva do pagamento (`data_pagamento`, date-only, fuso de MS). Se a cobrança
 * tiver mais de uma data (dados legados), usa a mais recente; se `data_pagamento`
 * faltar, deriva do timestamp `pago_em` convertido para o fuso de MS.
 */
function pagamentoInfo(c: DebitosPorCompetencia): { texto: string; registradoEm?: string } | null {
  let ref: DebitosPorCompetencia['debitos'][number] | null = null;
  let refData: string | null = null;
  for (const d of c.debitos) {
    if (d.situacao !== 'PAGO') continue;
    const data = d.data_pagamento ?? (d.pago_em ? businessDateFromTimestamp(d.pago_em) : null);
    if (ref === null || (data !== null && (refData === null || data > refData))) {
      ref = d;
      refData = data;
    }
  }
  if (ref === null) return null;

  const partes: string[] = [];
  if (refData) partes.push(`Pago em ${formatDataBr(refData)}`);
  else if (ref.pago_em) partes.push(`Pago em ${formatDateTimeBr(ref.pago_em)}`);
  else partes.push('Pago');
  if (ref.forma_pagamento) partes.push(FORMA_PAGAMENTO_LABELS[ref.forma_pagamento]);
  return {
    texto: partes.join(' · '),
    registradoEm: ref.pago_em ? formatDateTimeBr(ref.pago_em) : undefined,
  };
}

/**
 * Seção "Cobranças" da tela do membro: uma cobrança por competência (mês) =
 * soma de todos os débitos do mês, com uma única situação (Em aberto / Pago).
 * A situação e os totais são calculados pelo servidor; a baixa é da cobrança
 * inteira (tudo-ou-nada), nunca de um débito isolado.
 */
export default function DebitosPorCompetenciaSection({
  lojaId,
  membroId,
}: DebitosPorCompetenciaSectionProps) {
  const canPagar = useCanPagarDebito();
  const [cobrancas, setCobrancas] = useState<DebitosPorCompetencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [pagarAlvo, setPagarAlvo] = useState<DebitosPorCompetencia | null>(null);
  const [pagando, setPagando] = useState(false);
  const [pagarError, setPagarError] = useState<string | null>(null);
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
  }, [lojaId, membroId, reloadKey]);

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
      // do item da lista): substitui-a no estado, sem nova consulta. Se ela não
      // estiver na lista (não deveria ocorrer), recarrega.
      if (cobrancas?.some((c) => c.competencia === atualizada.competencia)) {
        setCobrancas((atual) =>
          atual ? atual.map((c) => (c.competencia === atualizada.competencia ? atualizada : c)) : atual
        );
      } else {
        setReloadKey((k) => k + 1);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Cobrança/membro não existe mais: a lista está desatualizada.
        setPagarAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        setReloadKey((k) => k + 1);
      } else {
        // 422, 500 e rede: mantém o diálogo aberto com a mensagem.
        setPagarError(extractErrorMessage(err));
      }
    } finally {
      setPagando(false);
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
            return (
              <section key={c.competencia} aria-labelledby={headingId}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 id={headingId} className="m-0 text-sm font-semibold text-slate-900">
                      Cobrança de {formatCompetenciaExtenso(c.competencia)}
                    </h4>
                    <SituacaoBadge situacao={c.situacao} />
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
    </Card>
  );
}
