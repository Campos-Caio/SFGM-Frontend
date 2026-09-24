import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Alert, Button, FormField, Input, Modal, Select } from '../../components/ui';
import {
  FORMA_PAGAMENTO_LABELS,
  type DebitoMembroPagamentoInput,
  type DebitosPorCompetencia,
  type FormaPagamento,
} from '../../types/debito';
import { todayBusinessDate } from '../../utils/businessTime';
import { formatCompetenciaExtenso, formatCurrency } from '../../utils/formatters';

interface PagarCobrancaDialogProps {
  cobranca: DebitosPorCompetencia;
  /** Pagamento em andamento: o diálogo não fecha e o botão fica desabilitado. */
  submitting: boolean;
  /** Erro do servidor/rede exibido dentro do diálogo (o diálogo continua aberto). */
  error: string | null;
  onConfirm: (input: DebitoMembroPagamentoInput) => void;
  onClose: () => void;
}

/**
 * Diálogo de baixa da cobrança de um mês: data do pagamento (padrão hoje em
 * MS, nunca futura) e forma de pagamento opcional. Monte-o somente quando
 * houver uma cobrança alvo: o estado do formulário nasce a cada abertura.
 */
export default function PagarCobrancaDialog({
  cobranca,
  submitting,
  error,
  onConfirm,
  onClose,
}: PagarCobrancaDialogProps) {
  const hoje = todayBusinessDate();
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [forma, setForma] = useState<FormaPagamento | ''>('');
  const [dataError, setDataError] = useState<string | null>(null);

  const titulo = `Cobrança de ${formatCompetenciaExtenso(cobranca.competencia)}`;

  function handleClose() {
    // Não permite fechar (ESC, overlay, X) enquanto o pagamento é registrado.
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
    // Chaves vazias são omitidas (o servidor usa hoje e nenhuma forma).
    const input: DebitoMembroPagamentoInput = {};
    if (dataPagamento) input.data_pagamento = dataPagamento;
    if (forma) input.forma_pagamento = forma;
    onConfirm(input);
  }

  return (
    <Modal
      open
      title="Marcar cobrança como paga"
      description={`${titulo} · Total ${formatCurrency(cobranca.total)}`}
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" icon={CheckCircle2} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Confirmar pagamento'}
          </Button>
        </>
      }
    >
      <p className="m-0 mb-3 text-slate-500">
        Todos os débitos desta cobrança serão marcados como pagos. Esta ação não pode ser desfeita.
      </p>
      <FormField label="Data do pagamento" htmlFor="pagamento_data" error={dataError ?? undefined}>
        <Input
          id="pagamento_data"
          type="date"
          value={dataPagamento}
          max={hoje}
          onChange={(e) => setDataPagamento(e.target.value)}
          disabled={submitting}
        />
      </FormField>
      <FormField label="Forma de pagamento" htmlFor="pagamento_forma">
        <Select
          id="pagamento_forma"
          value={forma}
          onChange={(e) => setForma(e.target.value as FormaPagamento | '')}
          disabled={submitting}
        >
          <option value="">Não informar</option>
          {Object.entries(FORMA_PAGAMENTO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>
      {error && (
        <Alert variant="error" className="mt-2 mb-0">
          {error}
        </Alert>
      )}
    </Modal>
  );
}
