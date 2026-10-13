import { useState } from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { Alert, ConfirmDialog } from '../../components/ui';
import type { DebitosPorCompetencia, ModoDesfazerPagamento } from '../../types/debito';
import { formatCompetenciaExtenso, formatCurrency } from '../../utils/formatters';
import { somarValores } from '../../utils/money';

interface DesfazerPagamentoDialogProps {
  cobranca: DebitosPorCompetencia;
  /** Nome do irmão, exibido quando a tela lista cobranças de vários irmãos. */
  membroNome?: string;
  submitting: boolean;
  error: string | null;
  /**
   * `modo` só é informado quando a cobrança teve baixa com excedente (o
   * tesoureiro escolhe o que desfazer); nos demais casos vem `undefined`.
   */
  onConfirm: (modo?: ModoDesfazerPagamento) => void;
  onClose: () => void;
}

const radioClass =
  'mt-0.5 h-4 w-4 shrink-0 cursor-pointer border-slate-300 accent-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed';

/**
 * Confirmação de "Desfazer pagamento": a baixa é removida por completo e os
 * débitos voltam a ficar em aberto. Pago em dinheiro: os lançamentos de
 * receita gerados pela baixa são excluídos. Pago com crédito: o crédito usado
 * volta para o irmão (não havia receita). Baixa com excedente (o irmão pagou a
 * mais): o tesoureiro escolhe entre desfazer só o pagamento (o valor recebido
 * continua como crédito) ou cancelar também a entrada de crédito. Mantém-se
 * aberto mostrando o erro quando a operação falha.
 */
export default function DesfazerPagamentoDialog({
  cobranca,
  membroNome,
  submitting,
  error,
  onConfirm,
  onClose,
}: DesfazerPagamentoDialogProps) {
  const [modo, setModo] = useState<ModoDesfazerPagamento>('SOMENTE_PAGAMENTO');

  const mes = formatCompetenciaExtenso(cobranca.competencia);
  const pagos = cobranca.debitos.filter((d) => d.situacao === 'PAGO');
  const pagosComCredito = pagos.filter((d) => d.forma_pagamento === 'CREDITO');
  const pagosSemCredito = pagos.length - pagosComCredito.length;
  const creditoDevolvido = somarValores(pagosComCredito.map((d) => d.valor));
  const excedente = cobranca.pagamento_excedente;

  const pergunta = (
    <p className="m-0">
      Desfazer o pagamento da cobrança de {mes}
      {membroNome ? ` de ${membroNome}` : ''} ({formatCurrency(cobranca.total)})?
    </p>
  );

  if (excedente) {
    const cancelarTudo = modo === 'CANCELAR_TUDO';
    let confirmLabel = cancelarTudo ? 'Cancelar pagamento e crédito' : 'Desfazer só o pagamento';
    if (submitting) confirmLabel = cancelarTudo ? 'Cancelando...' : 'Desfazendo...';
    return (
      <ConfirmDialog
        open
        title="Desfazer pagamento"
        confirmLabel={confirmLabel}
        confirmIcon={cancelarTudo ? Trash2 : Undo2}
        confirmDisabled={submitting}
        destructive={cancelarTudo}
        cancelLabel="Voltar"
        onConfirm={() => onConfirm(modo)}
        onCancel={onClose}
      >
        {error && <Alert variant="error">{error}</Alert>}
        {pergunta}
        <p className="mt-2 mb-0 text-sm text-slate-600">
          Nesta baixa o irmão pagou a mais: recebido{' '}
          <strong className="tabular-nums">{formatCurrency(excedente.valor_recebido)}</strong> ·{' '}
          <strong className="tabular-nums">{formatCurrency(excedente.valor_excedente)}</strong>{' '}
          ficaram como crédito.
        </p>
        <fieldset className="m-0 mt-4 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-medium text-slate-700">O que deseja desfazer?</legend>
          <div className="flex items-start gap-2">
            <input
              id="desfazer_modo_pagamento"
              type="radio"
              name="desfazer_modo"
              className={radioClass}
              checked={!cancelarTudo}
              onChange={() => setModo('SOMENTE_PAGAMENTO')}
              disabled={submitting}
              aria-describedby="desfazer_modo_pagamento-hint"
            />
            <div className="flex flex-col">
              <label
                htmlFor="desfazer_modo_pagamento"
                className="cursor-pointer text-sm font-medium text-slate-700"
              >
                Desfazer só o pagamento
              </label>
              <p id="desfazer_modo_pagamento-hint" className="m-0 mt-0.5 text-sm text-slate-500">
                A cobrança volta a ficar em aberto e os {formatCurrency(excedente.valor_recebido)}{' '}
                recebidos continuam como crédito do irmão.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <input
              id="desfazer_modo_tudo"
              type="radio"
              name="desfazer_modo"
              className={radioClass}
              checked={cancelarTudo}
              onChange={() => setModo('CANCELAR_TUDO')}
              disabled={submitting || !excedente.pode_cancelar_tudo}
              aria-describedby="desfazer_modo_tudo-hint"
            />
            <div className="flex flex-col">
              <label
                htmlFor="desfazer_modo_tudo"
                className={`text-sm font-medium ${
                  excedente.pode_cancelar_tudo ? 'cursor-pointer text-slate-700' : 'text-slate-400'
                }`}
              >
                Cancelar pagamento e crédito
              </label>
              <p id="desfazer_modo_tudo-hint" className="m-0 mt-0.5 text-sm text-slate-500">
                {excedente.pode_cancelar_tudo ? (
                  <>
                    A cobrança volta a ficar em aberto e a entrada de{' '}
                    {formatCurrency(excedente.valor_recebido)} (com o lançamento de receita) é
                    excluída. Use se o dinheiro não foi recebido.
                  </>
                ) : (
                  <>
                    Indisponível:{' '}
                    {excedente.motivo_bloqueio ?? 'o crédito desta baixa não pode mais ser excluído.'}
                  </>
                )}
              </p>
            </div>
          </div>
        </fieldset>
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialog
      open
      title="Desfazer pagamento"
      confirmLabel={submitting ? 'Desfazendo...' : 'Desfazer pagamento'}
      confirmIcon={Undo2}
      confirmDisabled={submitting}
      onConfirm={() => onConfirm()}
      onCancel={onClose}
    >
      {error && <Alert variant="error">{error}</Alert>}
      {pergunta}
      {pagosComCredito.length > 0 ? (
        <p className="mt-2 mb-0 text-sm text-slate-600">
          Esta cobrança foi paga com crédito: o crédito de {formatCurrency(creditoDevolvido)} volta
          para o irmão
          {pagosSemCredito > 0
            ? ' e os lançamentos de receita gerados pelo restante do pagamento serão excluídos'
            : ''}
          . A cobrança voltará a ficar em aberto. Use apenas para corrigir um pagamento registrado
          por engano.
        </p>
      ) : (
        <p className="mt-2 mb-0 text-sm text-slate-600">
          Os lançamentos de receita gerados por esse pagamento serão excluídos e a cobrança
          voltará a ficar em aberto. Use apenas para corrigir um pagamento registrado por engano.
        </p>
      )}
    </ConfirmDialog>
  );
}
