import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Pencil } from 'lucide-react';
import { lojaApi } from '../../api/loja';
import { extractErrorMessage } from '../../api/client';
import { emptyToNull } from '../../utils/emptyToNull';
import { formatCurrency } from '../../utils/formatters';
import { useCurrentStore } from '../../hooks/useCurrentStore';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  ErrorState,
  FormActions,
  FormCard,
  FormField,
  FormSection,
  Input,
  PageHeader,
} from '../../components/ui';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { Loja, LojaInput } from '../../types/loja';

const emptyForm: LojaInput = {
  nome: '',
  numero: '',
  cnpj: '',
  telefone: '',
  email: '',
  pix_chave: '',
  pix_descricao: '',
  logo_url: '',
  mensalidade_valor: '',
};

function toFormValues(loja: Loja): LojaInput {
  return {
    nome: loja.nome,
    numero: loja.numero,
    cnpj: loja.cnpj,
    telefone: loja.telefone ?? '',
    email: loja.email ?? '',
    pix_chave: loja.pix_chave ?? '',
    pix_descricao: loja.pix_descricao ?? '',
    logo_url: loja.logo_url ?? '',
    mensalidade_valor: loja.mensalidade_valor ?? '',
  };
}

export default function LojaPage() {
  const { loja: initialLoja, loading, error: loadError } = useCurrentStore();
  const [loja, setLoja] = useState<Loja | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [form, setForm] = useState<LojaInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sincroniza estado local assim que a loja atual carrega pela primeira vez.
  useEffect(() => {
    if (initialLoja) {
      setLoja(initialLoja);
    }
  }, [initialLoja]);

  function startEdit() {
    if (!loja) return;
    setForm(toFormValues(loja));
    setSaveError(null);
    setMode('edit');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!loja) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: LojaInput = {
        ...form,
        telefone: emptyToNull(form.telefone ?? ''),
        email: emptyToNull(form.email ?? ''),
        pix_chave: emptyToNull(form.pix_chave ?? ''),
        pix_descricao: emptyToNull(form.pix_descricao ?? ''),
        logo_url: emptyToNull(form.logo_url ?? ''),
        mensalidade_valor: emptyToNull(form.mensalidade_valor ?? ''),
      };
      const updated = await lojaApi.update(loja.id, payload);
      setLoja(updated);
      setSuccessMessage('Dados da Loja atualizados com sucesso.');
      setMode('view');
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Loja" />
        <SkeletonCard />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Loja" />
        <ErrorState message={loadError} />
      </>
    );
  }

  if (!loja) {
    return (
      <>
        <PageHeader title="Loja" />
        <EmptyState icon={Building2} title="Nenhuma loja cadastrada no sistema" />
      </>
    );
  }

  if (mode === 'edit') {
    return (
      <>
        <PageHeader title="Editar dados da Loja" description="Atualize as informações institucionais e de contato." />
        {saveError && (
          <Alert variant="error">Não foi possível salvar os dados. {saveError}</Alert>
        )}
        <FormCard onSubmit={handleSubmit}>
          <FormSection title="Informações gerais" description="Identificação institucional da Loja.">
            <FormField label="Nome" htmlFor="nome" required>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Número" htmlFor="numero" required>
              <Input
                id="numero"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                required
              />
            </FormField>
            <FormField label="CNPJ" htmlFor="cnpj" required>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                required
              />
            </FormField>
            <FormField label="URL do logo" htmlFor="logo_url">
              <Input
                id="logo_url"
                value={form.logo_url ?? ''}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              />
            </FormField>
          </FormSection>

          <FormSection title="Contato" description="Canais de comunicação da Loja.">
            <FormField label="Telefone" htmlFor="telefone">
              <Input
                id="telefone"
                value={form.telefone ?? ''}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </FormField>
            <FormField label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
          </FormSection>

          <FormSection title="PIX e mensalidade" description="Usados na emissão de documentos e geração de cobranças.">
            <FormField label="Chave PIX" htmlFor="pix_chave">
              <Input
                id="pix_chave"
                value={form.pix_chave ?? ''}
                onChange={(e) => setForm({ ...form, pix_chave: e.target.value })}
              />
            </FormField>
            <FormField label="Descrição do PIX" htmlFor="pix_descricao">
              <Input
                id="pix_descricao"
                value={form.pix_descricao ?? ''}
                onChange={(e) => setForm({ ...form, pix_descricao: e.target.value })}
              />
            </FormField>
            <FormField label="Valor da mensalidade (R$)" htmlFor="mensalidade_valor">
              <Input
                id="mensalidade_valor"
                type="number"
                step="0.01"
                min="0.01"
                value={form.mensalidade_valor ?? ''}
                onChange={(e) => setForm({ ...form, mensalidade_valor: e.target.value })}
              />
            </FormField>
          </FormSection>

          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setMode('view')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </FormActions>
        </FormCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Loja"
        description="Informações institucionais, contato e configurações usadas pelo sistema."
        actions={
          <Button icon={Pencil} onClick={startEdit}>
            Editar informações
          </Button>
        }
      />
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Informações gerais" />
          <DescriptionList
            items={[
              { label: 'Nome', value: loja.nome },
              { label: 'Número', value: loja.numero },
              { label: 'CNPJ', value: loja.cnpj },
              { label: 'URL do logo', value: loja.logo_url || '-' },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Contato" />
          <DescriptionList
            items={[
              { label: 'Telefone', value: loja.telefone || '-' },
              { label: 'E-mail', value: loja.email || '-' },
            ]}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="PIX e mensalidade" description="Usados na emissão de documentos e geração de cobranças." />
          <DescriptionList
            items={[
              { label: 'Chave PIX', value: loja.pix_chave || '-' },
              { label: 'Descrição do PIX', value: loja.pix_descricao || '-' },
              {
                label: 'Valor da mensalidade',
                value: loja.mensalidade_valor ? formatCurrency(loja.mensalidade_valor) : '-',
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
