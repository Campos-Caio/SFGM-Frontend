import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Button, FormField, Input, Modal, Select, Textarea } from '../../components/ui';
import {
  FORMA_PAGAMENTO_LABELS,
  FORMAS_PAGAMENTO_SELECIONAVEIS,
  type FormaPagamentoEntrada,
} from '../../types/debito';
import { CATEGORIA_PADRAO_CREDITO, type CreditoEntradaInput } from '../../types/creditoMembro';
import { todayBusinessDate } from '../../utils/businessTime';
import { SALDO_INICIAL_LIMITE, validarValorPositivo } from '../../utils/money';

interface RegistrarCreditoDialogProps {
  membroNome: string;
  /** Gravação em andamento: o diálogo não fecha e o botão fica desabilitado. */
  submitting: boolean;
  /** Erro geral do servidor/rede exibido dentro do diálogo. */
  error: string | null;
  /** Erros de validação do servidor (422) por campo do payload. */
  fieldErrors: Record<string, string>;
  onConfirm: (input: CreditoEntradaInput) => void;
  onClose: () => void;
}

/**
 * Diálogo "Registrar crédito": o irmão entregou dinheiro adiantado. Gera uma
 * receita no mês do recebimento (o servidor faz isso). Monte-o somente quando
 * for exibido: o estado do formulário nasce a cada abertura.
 */
export default function RegistrarCreditoDialog({
  membroNome,
  submitting,
  error,
  fieldErrors,
  onConfirm,
  onClose,
}: RegistrarCreditoDialogProps) {
  const hoje = todayBusinessDate();
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [forma, setForma] = useState<FormaPagamentoEntrada | ''>('');
  const [categoria, setCategoria] = useState(CATEGORIA_PADRAO_CREDITO);
  const [observacao, setObservacao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  function handleConfirm() {
    if (submitting) return;
    const novos: Record<string, string> = {};
    const erroValor = validarValorPositivo(valor);
    if (erroValor) novos.valor = erroValor;
    // Datas "YYYY-MM-DD" comparam corretamente como string.
    if (data && data > hoje) novos.data = 'A data do recebimento não pode ser futura.';
    if (!categoria.trim()) novos.categoria = 'Informe a categoria.';
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    // Chaves opcionais vazias são omitidas (o servidor aplica os padrões).
    const input: CreditoEntradaInput = { valor: valor.trim(), categoria: categoria.trim() };
    if (data) input.data = data;
    if (forma) input.forma_pagamento = forma;
    if (observacao.trim()) input.observacao = observacao.trim();
    onConfirm(input);
  }

  // Erro local tem prioridade; senão, o do servidor para o mesmo campo.
  const erro = (campo: string) => erros[campo] ?? fieldErrors[campo];

  return (
    <Modal
      open
      title="Registrar crédito"
      description={`Valor adiantado por ${membroNome}.`}
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" icon={Save} onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar crédito'}
          </Button>
        </>
      }
    >
      <p className="m-0 mb-3 text-slate-500">
        O valor entra no caixa como receita na data do recebimento e fica disponível para quitar
        cobranças do irmão com &quot;Pagar com crédito&quot;.
      </p>
      <FormField label="Valor (R$)" htmlFor="credito_valor" required error={erro('valor')}>
        <Input
          id="credito_valor"
          type="number"
          step="0.01"
          min="0.01"
          max={SALDO_INICIAL_LIMITE}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          disabled={submitting}
        />
      </FormField>
      <FormField label="Data do recebimento" htmlFor="credito_data" error={erro('data')}>
        <Input
          id="credito_data"
          type="date"
          value={data}
          max={hoje}
          onChange={(e) => setData(e.target.value)}
          disabled={submitting}
        />
      </FormField>
      <FormField label="Forma de pagamento" htmlFor="credito_forma" error={erro('forma_pagamento')}>
        <Select
          id="credito_forma"
          value={forma}
          onChange={(e) => setForma(e.target.value as FormaPagamentoEntrada | '')}
          disabled={submitting}
        >
          <option value="">Não informar</option>
          {FORMAS_PAGAMENTO_SELECIONAVEIS.map((value) => (
            <option key={value} value={value}>
              {FORMA_PAGAMENTO_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        label="Categoria da receita"
        htmlFor="credito_categoria"
        required
        error={erro('categoria')}
      >
        <Input
          id="credito_categoria"
          value={categoria}
          maxLength={255}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={submitting}
        />
      </FormField>
      <FormField label="Observação" htmlFor="credito_observacao" error={erro('observacao')}>
        <Textarea
          id="credito_observacao"
          rows={2}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
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
