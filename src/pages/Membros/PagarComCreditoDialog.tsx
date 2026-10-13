import { useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { Alert, Button, FormField, Input, Modal } from '../../components/ui';
import type { DebitosPorCompetencia, PagarComCreditoInput } from '../../types/debito';
import { todayBusinessDate } from '../../utils/businessTime';
import { formatCompetenciaExtenso, formatCurrency } from '../../utils/formatters';
import { subtrairValores } from '../../utils/money';

interface PagarComCreditoDialogProps {
  cobranca: DebitosPorCompetencia;
  /** Crédito disponível do irmão (do saldo carregado na ficha). */
  creditoDisponivel: string;
  /** Pagamento em andamento: o diálogo não fecha e o botão fica desabilitado. */
  submitting: boolean;
  /** Erro do servidor/rede exibido dentro do diálogo (o diálogo continua aberto). */
  error: string | null;
  onConfirm: (input: PagarComCreditoInput) => void;
  onClose: () => void;
}

/**
 * Diálogo "Pagar com crédito": quita todo o valor em aberto da cobrança com o
 * crédito adiantado do irmão. Data editável (padrão hoje em MS, nunca futura),
 * como na baixa normal. Monte-o somente quando houver uma cobrança alvo.
 */
export default function PagarComCreditoDialog({
  cobranca,
  creditoDisponivel,
  submitting,
  error,
  onConfirm,
  onClose,
}: PagarComCreditoDialogProps) {
  const hoje = todayBusinessDate();
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [dataError, setDataError] = useState<string | null>(null);

  const titulo = `Cobrança de ${formatCompetenciaExtenso(cobranca.competencia)}`;
  const restante = subtrairValores(creditoDisponivel, cobranca.total_em_aberto);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function handleConfirm() {
    if (submitting) return;
    // Datas "YYYY-MM-DD" comparam corretamente como string.
    if (dataPagamento > hoje) {
      setDataError('A data do pagamento não pode ser futura.');
      return;
    }
    setDataError(null);
    // Data vazia é omitida (o servidor usa hoje).
    onConfirm(dataPagamento ? { data_pagamento: dataPagamento } : {});
  }

  return (
    <Modal
      open
      title="Pagar com crédito"
      description={`${titulo} · Em aberto ${formatCurrency(cobranca.total_em_aberto)}`}
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" icon={PiggyBank} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Pagar com crédito'}
          </Button>
        </>
      }
    >
      <p className="m-0 mb-2 text-slate-600">
        O valor em aberto ({formatCurrency(cobranca.total_em_aberto)}) será quitado com o crédito do
        irmão. Crédito disponível: {formatCurrency(creditoDisponivel)} · restará{' '}
        {formatCurrency(restante)}.
      </p>
      <p className="m-0 mb-3 text-sm text-slate-500">
        Nenhuma receita nova é lançada: o dinheiro entrou no caixa quando o crédito foi registrado.
      </p>
      <FormField
        label="Data do pagamento"
        htmlFor="pagamento_credito_data"
        error={dataError ?? undefined}
      >
        <Input
          id="pagamento_credito_data"
          type="date"
          value={dataPagamento}
          max={hoje}
          onChange={(e) => setDataPagamento(e.target.value)}
          disabled={submitting}
        />
      </FormField>
      {error && (
        <Alert variant="error" className="mt-2 mb-0">
          {error}
        </Alert>
      )}
    </Modal>
  );
}
