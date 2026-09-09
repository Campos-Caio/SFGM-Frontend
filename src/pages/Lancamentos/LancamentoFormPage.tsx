import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lancamentosApi } from '../../api/lancamentos';
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
  Textarea,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { LancamentoTipo } from '../../types/lancamento';
import { competenciaToMonthInput, monthInputToCompetencia } from '../../utils/formatters';

const CATEGORIAS_SUGERIDAS = [
  'Mensalidades',
  'Aluguel',
  'Internet',
  'Energia',
  'Material',
  'Evento',
  'Doação',
  'Outros',
];

interface FormValues {
  tipo: LancamentoTipo | '';
  categoria: string;
  descricao: string;
  valor: string;
  data: string;
  competencia_mes: string;
  observacao: string;
}

const emptyForm: FormValues = {
  tipo: '',
  categoria: '',
  descricao: '',
  valor: '',
  data: '',
  competencia_mes: '',
  observacao: '',
};

export default function LancamentoFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { loja, loading: loadingLoja } = useCurrentStore();

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [loadingLancamento, setLoadingLancamento] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingLancamento(true);
    lancamentosApi
      .get(Number(id))
      .then((l) =>
        setForm({
          tipo: l.tipo,
          categoria: l.categoria,
          descricao: l.descricao ?? '',
          valor: l.valor,
          data: l.data,
          competencia_mes: competenciaToMonthInput(l.competencia),
          observacao: l.observacao ?? '',
        })
      )
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setLoadingLancamento(false));
  }, [id, isEdit]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.tipo || !loja) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao || null,
      valor: form.valor,
      data: form.data,
      competencia: monthInputToCompetencia(form.competencia_mes),
      observacao: form.observacao || null,
    };
    try {
      if (isEdit && id) {
        const updated = await lancamentosApi.update(Number(id), payload);
        navigate(`/lancamentos/${updated.id}`, { state: { sucesso: 'atualizado' } });
      } else {
        const created = await lancamentosApi.create(loja.id, payload);
        navigate(`/lancamentos/${created.id}`, { state: { sucesso: 'criado' } });
      }
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const cancelUrl = isEdit && id ? `/lancamentos/${id}` : '/lancamentos';
  const cancelState =
    !isEdit && form.competencia_mes
      ? { competencia: monthInputToCompetencia(form.competencia_mes) }
      : undefined;
  const titulo = isEdit ? 'Editar lançamento' : 'Novo lançamento';

  if (loadingLoja || loadingLancamento) {
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
      <PageHeader title={titulo} description="Registre uma receita ou despesa da Loja." />
      {saveError && (
        <Alert variant="error">Não foi possível salvar o lançamento. {saveError}</Alert>
      )}
      <FormCard onSubmit={handleSubmit}>
        <FormSection title="Lançamento" description="Tipo, categoria e valores.">
          <div className="sm:col-span-2">
            <fieldset className="mb-1 border-0 p-0 m-0">
              <legend className="mb-1.5 text-sm font-medium text-slate-700 p-0">Tipo</legend>
              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-1.5 font-normal text-sm text-slate-700">
                  <input
                    type="radio"
                    name="tipo"
                    value="RECEITA"
                    checked={form.tipo === 'RECEITA'}
                    onChange={() => setForm({ ...form, tipo: 'RECEITA' })}
                    required
                  />
                  Receita
                </label>
                <label className="flex items-center gap-1.5 font-normal text-sm text-slate-700">
                  <input
                    type="radio"
                    name="tipo"
                    value="DESPESA"
                    checked={form.tipo === 'DESPESA'}
                    onChange={() => setForm({ ...form, tipo: 'DESPESA' })}
                  />
                  Despesa
                </label>
              </div>
            </fieldset>
          </div>

          <FormField label="Categoria" htmlFor="categoria" required>
            <Input
              id="categoria"
              list="categorias-sugeridas"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              required
            />
            <datalist id="categorias-sugeridas">
              {CATEGORIAS_SUGERIDAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(cancelUrl, cancelState ? { state: cancelState } : undefined)}
          >
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
