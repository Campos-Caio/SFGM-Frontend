import { Undo2 } from 'lucide-react';
import { Alert, ConfirmDialog } from '../../components/ui';
import type { DebitosPorCompetencia } from '../../types/debito';
import { formatCompetenciaExtenso, formatCurrency } from '../../utils/formatters';
import { somarValores } from '../../utils/money';

interface DesfazerPagamentoDialogProps {
  cobranca: DebitosPorCompetencia;
  /** Nome do irmão, exibido quando a tela lista cobranças de vários irmãos. */
  membroNome?: string;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmação de "Desfazer pagamento": a baixa é removida por completo e os
 * débitos voltam a ficar em aberto. Pago em dinheiro: os lançamentos de
 * receita gerados pela baixa são excluídos. Pago com crédito: o crédito usado
 * volta para o irmão (não havia receita). Mantém-se aberto mostrando o erro
 * quando a operação falha.
 */
export default function DesfazerPagamentoDialog({
  cobranca,
  membroNome,
  submitting,
  error,
  onConfirm,
  onClose,
}: DesfazerPagamentoDialogProps) {
  const mes = formatCompetenciaExtenso(cobranca.competencia);
  const pagos = cobranca.debitos.filter((d) => d.situacao === 'PAGO');
  const pagosComCredito = pagos.filter((d) => d.forma_pagamento === 'CREDITO');
  const pagosSemCredito = pagos.length - pagosComCredito.length;
  const creditoDevolvido = somarValores(pagosComCredito.map((d) => d.valor));

  return (
    <ConfirmDialog
      open
      title="Desfazer pagamento"
      confirmLabel={submitting ? 'Desfazendo...' : 'Desfazer pagamento'}
      confirmIcon={Undo2}
      confirmDisabled={submitting}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      {error && <Alert variant="error">{error}</Alert>}
      <p className="m-0">
        Desfazer o pagamento da cobrança de {mes}
        {membroNome ? ` de ${membroNome}` : ''} ({formatCurrency(cobranca.total)})?
      </p>
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
