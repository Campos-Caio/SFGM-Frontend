import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { debitosApi } from '../../api/debitos';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import {
  Alert,
  Button,
  Checkbox,
  ConfirmDialog,
  FormActions,
  FormCard,
  FormField,
  FormSection,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { DEBITO_TIPO_LABELS, type DebitoMembroInput, type DebitoMembroTipo } from '../../types/debito';
import type { Membro } from '../../types/membro';
import {
  competenciaToMonthInput,
  formatCurrency,
  formatMesAno,
  monthInputToCompetencia,
} from '../../utils/formatters';

interface FormValues {
  membro_id: string;
  tipo: DebitoMembroTipo | '';
  descricao: string;
  valor: string;
  data: string;
  competencia_mes: string;
  observacao: string;
}

const emptyForm: FormValues = {
  membro_id: '',
  tipo: '',
  descricao: '',
  valor: '',
  data: '',
  competencia_mes: '',
  observacao: '',
};

export default function DebitoFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { loja, loading: loadingLoja } = useCurrentStore();

  const [membros, setMembros] = useState<Membro[]>([]);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [loadingDebito, setLoadingDebito] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Débito de cobrança já paga não pode ser alterado (o backend responde 409 ao salvar).
  const [debitoPago, setDebitoPago] = useState(false);
  // Criação em massa: o mesmo débito para todos os irmãos ativos (só na criação).
  const [emMassa, setEmMassa] = useState(false);
  const [confirmEmMassaOpen, setConfirmEmMassaOpen] = useState(false);
  // No modo em massa a descrição é obrigatória (não vazia após trim).
  const [descricaoError, setDescricaoError] = useState<string | null>(null);
  const membrosAtivos = membros.filter((m) => m.status === 'ATIVO').length;

  useEffect(() => {
    if (loja) {
      membrosApi.list(loja.id).then(setMembros).catch(() => {});
    }
  }, [loja]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingDebito(true);
    debitosApi
      .get(Number(id))
      .then((d) => {
        setDebitoPago(d.situacao === 'PAGO');
        setForm({
          membro_id: String(d.membro_id),
          tipo: d.tipo,
          descricao: d.descricao ?? '',
          valor: d.valor,
          data: d.data,
          competencia_mes: competenciaToMonthInput(d.competencia),
          observacao: d.observacao ?? '',
        });
      })
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setLoadingDebito(false));
  }, [id, isEdit]);

  function buildPayload(tipo: DebitoMembroTipo): DebitoMembroInput {
    return {
      tipo,
      // Em massa: descrição obrigatória, enviada sem espaços nas pontas.
      // Individual: comportamento original (vazia vira null).
      descricao: emMassa ? form.descricao.trim() : form.descricao || null,
      valor: form.valor,
      data: form.data,
      competencia: monthInputToCompetencia(form.competencia_mes),
      observacao: form.observacao || null,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.tipo || debitoPago) return;
    if (emMassa && !isEdit) {
      if (!form.descricao.trim()) {
        setDescricaoError('Informe a descrição para lançar o débito para todos os irmãos.');
        return;
      }
      // Lançamento em massa exige confirmação explícita antes do envio.
      setSaveError(null);
      setConfirmEmMassaOpen(true);
      return;
    }
    if (!form.membro_id) return;
    setSaving(true);
    setSaveError(null);
    const payload = buildPayload(form.tipo);
    try {
      if (isEdit && id) {
        const updated = await debitosApi.update(Number(id), payload);
        navigate(`/debitos/${updated.id}`, { state: { sucesso: 'atualizado' } });
      } else {
        const created = await debitosApi.create(Number(form.membro_id), payload);
        navigate(`/debitos/${created.id}`, { state: { sucesso: 'criado' } });
      }
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmEmMassa() {
    if (!loja || !form.tipo || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const resultado = await debitosApi.lancarEmMassa(loja.id, buildPayload(form.tipo));
      navigate('/debitos', {
        state: {
          resultadoEmMassa: {
            criados: resultado.debitos_criados.length,
            ignorados: resultado.membros_ignorados,
          },
        },
      });
    } catch (err) {
      setConfirmEmMassaOpen(false);
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const cancelUrl = isEdit && id ? `/debitos/${id}` : '/debitos';
  const titulo = isEdit ? 'Editar débito' : 'Novo débito';

  if (loadingLoja || loadingDebito) {
    return (
      <>
        <PageHeader title={titulo} />
        <SkeletonCard />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title={titulo} />
        <Alert variant="error">{loadError}</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={titulo}
        description={
          emMassa
            ? 'Registre a mesma cobrança para todos os irmãos ativos desta loja.'
            : 'Registre uma cobrança para um irmão desta loja.'
        }
      />
      {debitoPago && (
        <Alert variant="warning">
          Este débito pertence a uma cobrança já paga e não pode ser alterado.
        </Alert>
      )}
      {saveError && <Alert variant="error">Não foi possível salvar o débito. {saveError}</Alert>}
      <FormCard onSubmit={handleSubmit}>
        <FormSection title="Débito" description="Quem deve e qual o tipo de cobrança.">
          {!isEdit && (
            <Checkbox
              id="em_massa"
              label="Aplicar a todos os irmãos ativos"
              hint="Lança o mesmo débito para cada irmão ativo. Irmãos que já têm um débito com o mesmo tipo e descrição na competência, ou com a competência já paga, são ignorados."
              checked={emMassa}
              onChange={(e) => {
                setEmMassa(e.target.checked);
                setDescricaoError(null);
              }}
            />
          )}
          {!emMassa && (
            <FormField label="Membro" htmlFor="membro_id" required>
              <Select
                id="membro_id"
                value={form.membro_id}
                onChange={(e) => setForm({ ...form, membro_id: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Tipo" htmlFor="tipo" required>
            <Select
              id="tipo"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as DebitoMembroTipo })}
              required
            >
              <option value="" disabled>
                Selecione...
              </option>
              {Object.entries(DEBITO_TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Descrição"
            htmlFor="descricao"
            required={emMassa}
            error={emMassa ? (descricaoError ?? undefined) : undefined}
          >
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => {
                setForm({ ...form, descricao: e.target.value });
                setDescricaoError(null);
              }}
              required={emMassa}
              maxLength={emMassa ? 255 : undefined}
              aria-invalid={emMassa && descricaoError ? true : undefined}
            />
          </FormField>
        </FormSection>

        <FormSection title="Valores e período" description="Quanto, quando e a que competência se refere.">
          <FormField label="Valor (R$)" htmlFor="valor" required>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              max="9999999999.99"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Data" htmlFor="data" required>
            <Input
              id="data"
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Competência" htmlFor="competencia_mes" required>
            <Input
              id="competencia_mes"
              type="month"
              value={form.competencia_mes}
              onChange={(e) => setForm({ ...form, competencia_mes: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Observação" htmlFor="observacao">
            <Textarea
              id="observacao"
              rows={3}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </FormField>
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => navigate(cancelUrl)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || debitoPago}>
            {emMassa
              ? saving
                ? 'Lançando...'
                : 'Lançar para todos'
              : saving
                ? 'Salvando...'
                : isEdit
                  ? 'Salvar'
                  : 'Cadastrar'}
          </Button>
        </FormActions>
      </FormCard>

      <ConfirmDialog
        open={confirmEmMassaOpen}
        title="Lançar débito para todos os irmãos ativos"
        destructive={false}
        confirmLabel={saving ? 'Lançando...' : 'Lançar para todos'}
        confirmDisabled={saving}
        onConfirm={handleConfirmEmMassa}
        onCancel={() => {
          if (!saving) setConfirmEmMassaOpen(false);
        }}
      >
        <p className="m-0">
          Será lançado um débito de <strong>{formatCurrency(form.valor)}</strong>
          {form.tipo ? ` (${DEBITO_TIPO_LABELS[form.tipo]})` : ''}
          {form.competencia_mes ? ` na competência ${formatMesAno(form.competencia_mes)}` : ''} para{' '}
          <strong>{membrosAtivos} irmão(s) ativo(s)</strong>.
        </p>
        <p className="m-0 mt-2 text-slate-500">
          Irmãos que já possuem este débito na competência, ou com a competência já paga, serão ignorados.
        </p>
      </ConfirmDialog>
    </>
  );
}
