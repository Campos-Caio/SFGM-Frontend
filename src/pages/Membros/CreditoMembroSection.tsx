import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarClock, CircleAlert, PiggyBank, Plus, Scale, Trash2 } from 'lucide-react';
import { creditosMembroApi } from '../../api/creditosMembro';
import { extractErrorMessage, extractFieldErrors } from '../../api/client';
import { useCanPagarDebito } from '../../hooks/usePermissions';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  ErrorState,
  IconButton,
  SituacaoSaldoBadge,
  StatCard,
  type DataTableColumn,
} from '../../components/ui';
import { SkeletonStatCards, SkeletonTable } from '../../components/ui/Skeleton';
import {
  MOVIMENTO_CREDITO_TIPO_LABELS,
  type CreditoEntradaInput,
  type MovimentoCredito,
  type SaldoMembro,
} from '../../types/creditoMembro';
import { FORMA_PAGAMENTO_LABELS } from '../../types/debito';
import type { Membro } from '../../types/membro';
import { formatCompetenciaExtenso, formatCurrency, formatDataBr } from '../../utils/formatters';
import { paraCentavos, rotuloSaldo } from '../../utils/money';
import RegistrarCreditoDialog from './RegistrarCreditoDialog';

interface CreditoMembroSectionProps {
  lojaId: number;
  membro: Membro;
  /** Saldo carregado pela ficha (compartilhado com a seção de cobranças). */
  saldo: SaldoMembro | null;
  saldoError: string | null;
  onRetrySaldo: () => void;
  /** Muda a cada ação financeira na ficha: recarrega o extrato. */
  versao: number;
  /** Avisa a ficha que o crédito mudou (recarrega saldo, extrato e cobranças). */
  onAlterado: () => void;
}

/** Descrição do movimento no extrato (a utilização indica a cobrança quitada). */
function descreverMovimento(m: MovimentoCredito): string {
  const tipo = MOVIMENTO_CREDITO_TIPO_LABELS[m.tipo];
  if (m.tipo === 'UTILIZACAO' && m.competencia_quitada) {
    return `${tipo} — cobrança de ${formatCompetenciaExtenso(m.competencia_quitada)}`;
  }
  return tipo;
}

/** 404/409: o estado mudou no servidor (irmão inativado, crédito já usado etc.). */
function isEstadoDesatualizado(err: unknown): boolean {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  return status === 404 || status === 409;
}

/**
 * Seção "Saldo e crédito" da ficha do irmão: em aberto (vencido), a vencer,
 * crédito disponível e saldo — sempre separados, calculados pelo servidor —,
 * o extrato do crédito do irmão e as ações de registrar/excluir crédito.
 */
export default function CreditoMembroSection({
  lojaId,
  membro,
  saldo,
  saldoError,
  onRetrySaldo,
  versao,
  onAlterado,
}: CreditoMembroSectionProps) {
  const membroId = membro.id;
  const canGerenciar = useCanPagarDebito();
  const inativo = membro.status === 'INATIVO';
  const [movimentos, setMovimentos] = useState<MovimentoCredito[] | null>(null);
  const [extratoError, setExtratoError] = useState<string | null>(null);
  const [extratoKey, setExtratoKey] = useState(0);
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; texto: string } | null>(
    null
  );

  const [registrarAberto, setRegistrarAberto] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [registrarError, setRegistrarError] = useState<string | null>(null);
  const [registrarFieldErrors, setRegistrarFieldErrors] = useState<Record<string, string>>({});

  const [excluirAlvo, setExcluirAlvo] = useState<MovimentoCredito | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [excluirError, setExcluirError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    creditosMembroApi
      .listMovimentos(lojaId, membroId)
      .then((data) => {
        if (!active) return;
        setMovimentos(data);
        setExtratoError(null);
      })
      .catch((err) => {
        if (active) setExtratoError(extractErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [lojaId, membroId, versao, extratoKey]);

  function abrirRegistrar() {
    setFeedback(null);
    setRegistrarError(null);
    setRegistrarFieldErrors({});
    setRegistrarAberto(true);
  }

  async function handleRegistrar(input: CreditoEntradaInput) {
    if (registrando) return;
    setRegistrando(true);
    setRegistrarError(null);
    setRegistrarFieldErrors({});
    try {
      const movimento = await creditosMembroApi.registrar(lojaId, membroId, input);
      setRegistrarAberto(false);
      setFeedback({
        variant: 'success',
        texto: `Crédito de ${formatCurrency(movimento.valor)} registrado.`,
      });
      onAlterado();
    } catch (err) {
      if (isEstadoDesatualizado(err)) {
        // Ex.: irmão inativado em outra tela (409): fecha e recarrega a ficha.
        setRegistrarAberto(false);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        onAlterado();
      } else {
        // 422 com erro por campo: a mensagem aparece junto ao campo; demais
        // erros (500, rede) aparecem no diálogo, que continua aberto.
        const porCampo = extractFieldErrors(err);
        setRegistrarFieldErrors(porCampo);
        setRegistrarError(Object.keys(porCampo).length > 0 ? null : extractErrorMessage(err));
      }
    } finally {
      setRegistrando(false);
    }
  }

  function abrirExcluir(movimento: MovimentoCredito) {
    setFeedback(null);
    setExcluirError(null);
    setExcluirAlvo(movimento);
  }

  async function handleExcluir() {
    if (!excluirAlvo || excluindo) return;
    const alvo = excluirAlvo;
    setExcluindo(true);
    setExcluirError(null);
    try {
      await creditosMembroApi.excluir(lojaId, membroId, alvo.id);
      setExcluirAlvo(null);
      setFeedback({
        variant: 'success',
        texto: `Crédito de ${formatCurrency(alvo.valor)} de ${formatDataBr(alvo.data)} excluído.`,
      });
      onAlterado();
    } catch (err) {
      if (isEstadoDesatualizado(err)) {
        // Ex.: crédito já usado para pagar uma cobrança (409).
        setExcluirAlvo(null);
        setFeedback({ variant: 'error', texto: extractErrorMessage(err) });
        onAlterado();
      } else {
        setExcluirError(extractErrorMessage(err));
      }
    } finally {
      setExcluindo(false);
    }
  }

  let resumo;
  if (saldo === null) {
    resumo = saldoError ? (
      <ErrorState message={saldoError} onRetry={onRetrySaldo} />
    ) : (
      <SkeletonStatCards count={4} />
    );
  } else {
    const emAberto = paraCentavos(saldo.total_em_aberto) > 0;
    const temCredito = paraCentavos(saldo.total_credito) > 0;
    resumo = (
      <>
        {saldoError && (
          <Alert variant="error">
            {saldoError}{' '}
            <Button variant="secondary" size="sm" onClick={onRetrySaldo} className="ml-2">
              Tentar novamente
            </Button>
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Em aberto (vencido)"
            value={formatCurrency(saldo.total_em_aberto)}
            icon={CircleAlert}
            tone={emAberto ? 'danger' : 'neutral'}
            hint={`${saldo.qtd_cobrancas_em_aberto} cobrança(s) em aberto`}
          />
          <StatCard
            label="A vencer"
            value={formatCurrency(saldo.total_a_vencer)}
            icon={CalendarClock}
            hint="Competências futuras (ainda não é dívida)"
          />
          <StatCard
            label="Crédito disponível"
            value={formatCurrency(saldo.total_credito)}
            icon={PiggyBank}
            tone={temCredito ? 'success' : 'neutral'}
            hint="Adiantado pelo irmão e ainda não usado"
          />
          <StatCard
            label="Saldo"
            value={rotuloSaldo(saldo.saldo)}
            icon={Scale}
            tone={
              saldo.situacao === 'DEVEDOR'
                ? 'danger'
                : saldo.situacao === 'CREDOR'
                  ? 'success'
                  : 'neutral'
            }
            hint={<SituacaoSaldoBadge situacao={saldo.situacao} />}
          />
        </div>
      </>
    );
  }

  const colunas: DataTableColumn<MovimentoCredito>[] = [
    { header: 'Data', render: (m) => formatDataBr(m.data) },
    { header: 'Movimento', wrap: true, render: descreverMovimento },
    {
      header: 'Forma',
      render: (m) => (m.forma_pagamento ? FORMA_PAGAMENTO_LABELS[m.forma_pagamento] : '-'),
    },
    { header: 'Observação', wrap: true, render: (m) => m.observacao || '-' },
    { header: 'Valor', align: 'right', render: (m) => formatCurrency(m.valor) },
  ];
  if (canGerenciar) {
    colunas.push({
      header: 'Ações',
      align: 'right',
      width: '5rem',
      // Só a entrada pode ser excluída (o servidor recusa se já tiver sido usada).
      render: (m) =>
        m.tipo === 'ENTRADA' ? (
          <IconButton
            icon={Trash2}
            size="sm"
            aria-label={`Excluir crédito de ${formatCurrency(m.valor)} de ${formatDataBr(m.data)}`}
            onClick={() => abrirExcluir(m)}
          />
        ) : null,
    });
  }

  let extrato;
  if (movimentos === null) {
    extrato = extratoError ? (
      <ErrorState message={extratoError} onRetry={() => setExtratoKey((k) => k + 1)} />
    ) : (
      <SkeletonTable columns={4} rows={2} />
    );
  } else if (movimentos.length === 0) {
    extrato = (
      <p className="m-0 text-sm text-slate-500">Nenhum crédito registrado para este irmão.</p>
    );
  } else {
    extrato = (
      <>
        {extratoError && <Alert variant="error">{extratoError}</Alert>}
        <DataTable rowKey={(m) => m.id} rows={movimentos} columns={colunas} />
      </>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Saldo e crédito do irmão"
        description="O crédito só quita uma cobrança quando é usado em “Pagar com crédito”."
        actions={
          canGerenciar ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={abrirRegistrar}
                disabled={inativo}
                aria-describedby={inativo ? 'credito-inativo-aviso' : undefined}
              >
                Registrar crédito
              </Button>
              {inativo && (
                <p id="credito-inativo-aviso" className="m-0 text-xs text-slate-500">
                  Irmão inativo não recebe crédito novo.
                </p>
              )}
            </div>
          ) : undefined
        }
      />
      {feedback && <Alert variant={feedback.variant}>{feedback.texto}</Alert>}
      {resumo}
      <div className="mt-6">
        <h4 className="m-0 mb-2 text-sm font-semibold text-slate-900">Extrato do crédito</h4>
        {extrato}
      </div>

      {registrarAberto && (
        <RegistrarCreditoDialog
          membroNome={membro.nome}
          submitting={registrando}
          error={registrarError}
          fieldErrors={registrarFieldErrors}
          onConfirm={handleRegistrar}
          onClose={() => setRegistrarAberto(false)}
        />
      )}

      {excluirAlvo && (
        <ConfirmDialog
          open
          title="Excluir crédito"
          confirmLabel={excluindo ? 'Excluindo...' : 'Excluir crédito'}
          confirmIcon={Trash2}
          confirmDisabled={excluindo}
          onConfirm={handleExcluir}
          onCancel={() => {
            if (!excluindo) setExcluirAlvo(null);
          }}
        >
          {excluirError && <Alert variant="error">{excluirError}</Alert>}
          <p className="m-0">
            Excluir o crédito de {formatCurrency(excluirAlvo.valor)} recebido em{' '}
            {formatDataBr(excluirAlvo.data)}?
          </p>
          <p className="mt-2 mb-0 text-sm text-slate-600">
            O lançamento de receita gerado por ele também será excluído. Use apenas para corrigir um
            crédito registrado por engano; um crédito já usado para pagar uma cobrança não pode ser
            excluído.
          </p>
        </ConfirmDialog>
      )}
    </Card>
  );
}
