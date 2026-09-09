import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { debitosApi } from '../../api/debitos';
import { membrosApi } from '../../api/membros';
import { extractErrorMessage } from '../../api/client';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import {
  Alert,
  Button,
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
import { DEBITO_TIPO_LABELS, type DebitoMembroTipo } from '../../types/debito';
import type { Membro } from '../../types/membro';
import { competenciaToMonthInput, monthInputToCompetencia } from '../../utils/formatters';

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
      .then((d) =>
        setForm({
          membro_id: String(d.membro_id),
          tipo: d.tipo,
          descricao: d.descricao ?? '',
          valor: d.valor,
          data: d.data,
          competencia_mes: competenciaToMonthInput(d.competencia),
          observacao: d.observacao ?? '',
        })
      )
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setLoadingDebito(false));
  }, [id, isEdit]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.membro_id || !form.tipo) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      tipo: form.tipo,
      descricao: form.descricao || null,
      valor: form.valor,
      data: form.data,
      competencia: monthInputToCompetencia(form.competencia_mes),
      observacao: form.observacao || null,
    };
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
      <PageHeader title={titulo} description="Registre uma cobrança para um irmão desta loja." />
      {saveError && <Alert variant="error">Não foi possível salvar o débito. {saveError}</Alert>}
      <FormCard onSubmit={handleSubmit}>
        <FormSection title="Débito" description="Quem deve e qual o tipo de cobrança.">
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
          <FormField label="Descrição" htmlFor="descricao">
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
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
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </FormActions>
      </FormCard>
    </>
  );
}
