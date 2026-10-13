import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Alert, Button, Checkbox, FormField, Input, Modal, Select } from '../../components/ui';
import {
  FORMA_PAGAMENTO_LABELS,
  FORMAS_PAGAMENTO_SELECIONAVEIS,
  type DebitoMembroPagamentoInput,
  type DebitosPorCompetencia,
  type FormaPagamentoEntrada,
} from '../../types/debito';
import { CATEGORIA_PADRAO_CREDITO } from '../../types/creditoMembro';
import { todayBusinessDate } from '../../utils/businessTime';
import { formatCompetenciaExtenso, formatCurrency } from '../../utils/formatters';
import {
  SALDO_INICIAL_LIMITE,
  compararValores,
  subtrairValores,
  validarValorPositivo,
} from '../../utils/money';

interface PagarCobrancaDialogProps {
  cobranca: DebitosPorCompetencia;
  /**
   * Irmão INATIVO: a baixa normal continua permitida, mas não é possível
   * guardar excedente como crédito (a opção fica desabilitada, com o motivo).
   */
  membroInativo?: boolean;
  /** Pagamento em andamento: o diálogo não fecha e o botão fica desabilitado. */
  submitting: boolean;
  /** Erro do servidor/rede exibido dentro do diálogo (o diálogo continua aberto). */
  error: string | null;
  onConfirm: (input: DebitoMembroPagamentoInput) => void;
  onClose: () => void;
}

/**
 * Diálogo de baixa da cobrança de um mês: data do pagamento (padrão hoje em
 * MS, nunca futura) e forma de pagamento opcional. Opcionalmente (fechado por
 * padrão), "O irmão pagou mais que o total": informa o valor recebido e a
 * diferença sobre o valor em aberto fica como crédito do irmão (o servidor faz
 * tudo numa única operação). Monte-o somente quando houver uma cobrança alvo:
 * o estado do formulário nasce a cada abertura.
 */
export default function PagarCobrancaDialog({
  cobranca,
  membroInativo = false,
  submitting,
  error,
  onConfirm,
  onClose,
}: PagarCobrancaDialogProps) {
  const hoje = todayBusinessDate();
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [forma, setForma] = useState<FormaPagamentoEntrada | ''>('');
  const [dataError, setDataError] = useState<string | null>(null);
  const [pagouMais, setPagouMais] = useState(false);
  const [valorRecebido, setValorRecebido] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIA_PADRAO_CREDITO);
  const [valorError, setValorError] = useState<string | null>(null);
  const [categoriaError, setCategoriaError] = useState<string | null>(null);

  const titulo = `Cobrança de ${formatCompetenciaExtenso(cobranca.competencia)}`;
  // A referência do "pagou a mais" é o valor ainda em aberto (o que a baixa quita).
  const emAberto = cobranca.total_em_aberto;

  const informarValor = pagouMais && !membroInativo;
  const valorValido = informarValor && validarValorPositivo(valorRecebido) === null;
  const diferenca = valorValido ? compararValores(valorRecebido, emAberto) : 0;
  const haExcedente = valorValido && diferenca > 0;
  const semDiferenca = valorValido && diferenca === 0;

  function handleClose() {
    // Não permite fechar (ESC, overlay, X) enquanto o pagamento é registrado.
    if (submitting) return;
    onClose();
  }

  function handleConfirm() {
    if (submitting) return;
    let invalido = false;
    // Datas "YYYY-MM-DD" comparam corretamente como string.
    if (dataPagamento > hoje) {
      setDataError('A data do pagamento não pode ser futura.');
      invalido = true;
    } else {
      setDataError(null);
    }

    let erroValor: string | null = null;
    let erroCategoria: string | null = null;
    if (informarValor) {
      erroValor = validarValorPositivo(valorRecebido);
      if (!erroValor && compararValores(valorRecebido, emAberto) < 0) {
        erroValor = `O valor recebido não pode ser menor que o valor em aberto da cobrança (${formatCurrency(emAberto)}).`;
      }
      // A categoria só é usada (e enviada) quando há excedente.
      if (haExcedente && !categoria.trim()) erroCategoria = 'Informe a categoria.';
    }
    setValorError(erroValor);
    setCategoriaError(erroCategoria);
    if (invalido || erroValor || erroCategoria) return;

    // Chaves vazias são omitidas (o servidor usa hoje e nenhuma forma).
    const input: DebitoMembroPagamentoInput = {};
    if (dataPagamento) input.data_pagamento = dataPagamento;
    if (forma) input.forma_pagamento = forma;
    // Só há campos novos quando existe excedente: valor igual ao em aberto é a
    // baixa normal, e a opção desmarcada mantém o corpo de sempre.
    if (haExcedente) {
      input.valor_recebido = valorRecebido.trim();
      input.categoria_credito = categoria.trim();
    }
    onConfirm(input);
  }

  let confirmLabel = 'Confirmar pagamento';
  if (submitting) confirmLabel = 'Registrando...';
  else if (haExcedente) confirmLabel = 'Confirmar pagamento e crédito';

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
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="m-0 mb-3 text-slate-500">
        Todos os débitos desta cobrança serão marcados como pagos. Se o pagamento for registrado por
        engano, ele pode ser desfeito depois em &quot;Desfazer pagamento&quot;.
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
      <Checkbox
        id="pagamento_pagou_mais"
        label="O irmão pagou mais que o total"
        hint={
          membroInativo
            ? 'Irmão inativo: não é possível guardar crédito. A baixa normal continua disponível.'
            : 'A diferença fica como crédito para ele.'
        }
        checked={informarValor}
        onChange={(e) => setPagouMais(e.target.checked)}
        disabled={submitting || membroInativo}
      />
      {informarValor && (
        <div className="ml-6">
          <FormField
            label="Valor recebido (R$)"
            htmlFor="pagamento_valor_recebido"
            required
            error={valorError ?? undefined}
          >
            <Input
              id="pagamento_valor_recebido"
              type="number"
              step="0.01"
              min="0.01"
              max={SALDO_INICIAL_LIMITE}
              value={valorRecebido}
              onChange={(e) => {
                setValorRecebido(e.target.value);
                setValorError(null);
              }}
              disabled={submitting}
            />
          </FormField>
          <FormField
            label="Categoria da receita"
            htmlFor="pagamento_categoria_credito"
            required
            error={categoriaError ?? undefined}
          >
            <Input
              id="pagamento_categoria_credito"
              value={categoria}
              maxLength={255}
              onChange={(e) => {
                setCategoria(e.target.value);
                setCategoriaError(null);
              }}
              disabled={submitting}
            />
          </FormField>
          {haExcedente && (
            <Alert variant="info" className="mb-0">
              Cobrança {formatCurrency(emAberto)} · Crédito do irmão{' '}
              <strong className="tabular-nums">
                {formatCurrency(subtrairValores(valorRecebido, emAberto))}
              </strong>
            </Alert>
          )}
          {semDiferenca && (
            <Alert variant="info" className="mb-0">
              Sem diferença: será feita a baixa normal, sem crédito.
            </Alert>
          )}
        </div>
      )}
      {error && (
        <Alert variant="error" className="mt-2 mb-0">
          {error}
        </Alert>
      )}
    </Modal>
  );
}
