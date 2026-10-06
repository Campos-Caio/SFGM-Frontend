import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Button, FormField, Input, Modal } from '../../components/ui';
import { SALDO_INICIAL_LIMITE, validarSaldoInicial } from '../../utils/money';

interface SaldoInicialDialogProps {
  /** Saldo inicial atual (preenche o campo ao abrir). */
  valorAtual: string;
  /** Gravação em andamento: o diálogo não fecha e o botão fica desabilitado. */
  submitting: boolean;
  /** Erro do servidor/rede exibido dentro do diálogo (o diálogo continua aberto). */
  error: string | null;
  onConfirm: (saldoInicial: string) => void;
  onClose: () => void;
}

/**
 * Diálogo para definir o saldo inicial do Caixa. Monte-o somente quando for
 * exibido: o estado do formulário nasce a cada abertura.
 */
export default function SaldoInicialDialog({
  valorAtual,
  submitting,
  error,
  onConfirm,
  onClose,
}: SaldoInicialDialogProps) {
  const [valor, setValor] = useState(valorAtual);
  const [valorError, setValorError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function handleConfirm() {
    if (submitting) return;
    const erro = validarSaldoInicial(valor);
    setValorError(erro);
    if (erro) return;
    onConfirm(valor.trim());
  }

  return (
    <Modal
      open
      title="Definir saldo inicial"
      description="Valor em caixa antes do primeiro lançamento registrado no sistema."
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" icon={Save} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <FormField
        label="Saldo inicial (R$)"
        htmlFor="saldo_inicial"
        required
        error={valorError ?? undefined}
        hint="Pode ser zero ou negativo (caixa que começou devendo)."
      >
        <Input
          id="saldo_inicial"
          type="number"
          step="0.01"
          min={-SALDO_INICIAL_LIMITE}
          max={SALDO_INICIAL_LIMITE}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
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
