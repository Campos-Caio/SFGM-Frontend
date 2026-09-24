import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { emptyToNull } from '../../utils/emptyToNull';

interface FormValues {
  nome: string;
  cim: string;
  telefone: string;
  email: string;
}

const emptyForm: FormValues = { nome: '', cim: '', telefone: '', email: '' };

export default function MembroFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { loja, loading: loadingLoja } = useCurrentStore();

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [loadingMembro, setLoadingMembro] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingMembro(true);
    membrosApi
      .get(Number(id))
      .then((membro) =>
        setForm({
          nome: membro.nome,
          cim: membro.cim,
          telefone: membro.telefone ?? '',
          email: membro.email ?? '',
        })
      )
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setLoadingMembro(false));
  }, [id, isEdit]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    const payload = {
      nome: form.nome,
      cim: form.cim,
      telefone: emptyToNull(form.telefone),
      email: emptyToNull(form.email),
    };
    try {
      if (isEdit && id) {
        const updated = await membrosApi.update(Number(id), payload);
        navigate(`/membros/${updated.id}`, { state: { sucesso: 'atualizado' } });
      } else {
        if (!loja) return;
        const created = await membrosApi.create({ ...payload, loja_id: loja.id });
        navigate(`/membros/${created.id}`, { state: { sucesso: 'criado' } });
      }
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const cancelUrl = isEdit && id ? `/membros/${id}` : '/membros';
  const titulo = isEdit ? 'Editar membro' : 'Novo membro';

  if (loadingLoja || loadingMembro) {
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
        description={isEdit ? 'Atualize os dados cadastrais do irmão.' : 'Cadastre um novo irmão nesta loja.'}
      />
      {saveError && <Alert variant="error">Não foi possível salvar o membro. {saveError}</Alert>}
      <FormCard onSubmit={handleSubmit}>
        <FormSection title="Informações pessoais" description="Identificação do irmão na Loja.">
          <FormField label="Nome" htmlFor="nome" required>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              maxLength={255}
              required
            />
          </FormField>
          <FormField label="CIM" htmlFor="cim" required>
            <Input
              id="cim"
              value={form.cim}
              onChange={(e) => setForm({ ...form, cim: e.target.value })}
              maxLength={50}
              required
            />
          </FormField>
        </FormSection>

        <FormSection title="Contato" description="Opcional — usado para comunicações e cobranças.">
          <FormField label="Telefone" htmlFor="telefone">
            <Input
              id="telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              maxLength={20}
            />
          </FormField>
          <FormField label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={255}
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
