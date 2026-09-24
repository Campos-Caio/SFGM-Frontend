import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { extractErrorMessage, extractFieldErrors } from '../../api/client';
import { emptyToNull } from '../../utils/emptyToNull';
import { Alert, Button, FormActions, FormCard, FormField, FormSection, Input } from '../ui';
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
};

const LOGO_URL_INVALIDA = 'Informe uma URL https:// válida (ex.: https://exemplo.com/logo.png).';

/**
 * Espelha a regra do backend para `logo_url`: vazio é permitido (vira null);
 * caso contrário, apenas URL absoluta `https://` com host. http://, data:,
 * file:// e URLs relativas são rejeitadas (o backend responde 422).
 */
function validarLogoUrl(valor: string): string | null {
  const url = valor.trim();
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) return LOGO_URL_INVALIDA;
  try {
    return new URL(url).hostname ? null : LOGO_URL_INVALIDA;
  } catch {
    return LOGO_URL_INVALIDA;
  }
}

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
  };
}

interface LojaFormProps {
  /** Loja em edição; ausente no cadastro (form começa vazio). */
  loja?: Loja;
  /**
   * Persiste os dados (criação ou atualização). Deve rejeitar com o erro da
   * API para que o form exiba a mensagem (ex.: 409) e os erros por campo (422).
   */
  onSubmit: (payload: LojaInput) => Promise<void>;
  /**
   * Layout de modal (cadastro): campos em grade compacta, sem "URL do logo" e
   * sem botões próprios — o Modal os renderiza no rodapé ligados a este id
   * (`<Button form={formId}>`).
   * Sem ele, usa o layout de página (FormCard/FormSection + FormActions).
   */
  formId?: string;
  onCancel?: () => void;
  submitLabel?: string;
}

/** Grupo de campos do layout de modal: título + grade que vira 1 coluna no mobile. */
function ModalFieldGroup({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="m-0 mb-3 text-sm font-semibold text-slate-900">{title}</h4>
      <div className={`grid grid-cols-1 gap-x-4 ${className}`}>{children}</div>
    </section>
  );
}

/**
 * Formulário de dados da Loja, compartilhado pela edição (LojaPage) e pelo
 * cadastro (CriarLojaModal): validação de logo_url no cliente, conversão de
 * opcionais vazios em null e exibição dos erros da API.
 */
export function LojaForm({ loja, onSubmit, formId, onCancel, submitLabel = 'Salvar' }: LojaFormProps) {
  const [form, setForm] = useState<LojaInput>(() => (loja ? toFormValues(loja) : emptyForm));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Erros por campo: validação no cliente e 422 do backend (`detail[].loc`).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);

  // O botão de salvar fica no fim do form (e, no modal, a área rola): traz o
  // alerta de erro para a vista quando a API recusa os dados.
  useEffect(() => {
    if (saveError) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [saveError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const logoUrlError = validarLogoUrl(form.logo_url ?? '');
    if (logoUrlError) {
      setFieldErrors({ logo_url: logoUrlError });
      return;
    }
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      await onSubmit({
        ...form,
        telefone: emptyToNull(form.telefone ?? ''),
        email: emptyToNull(form.email ?? ''),
        pix_chave: emptyToNull(form.pix_chave ?? ''),
        pix_descricao: emptyToNull(form.pix_descricao ?? ''),
        logo_url: emptyToNull(form.logo_url ?? ''),
      });
    } catch (err) {
      const errosPorCampo = extractFieldErrors(err);
      const campos = Object.keys(errosPorCampo);
      setFieldErrors(errosPorCampo);
      // Só resume o alerta quando todo erro aparece junto a um campo do form;
      // senão, mostra a mensagem completa para nada ficar oculto.
      setSaveError(
        campos.length > 0 && campos.every((campo) => campo in emptyForm)
          ? 'Verifique os campos destacados.'
          : extractErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(campo: keyof LojaInput, valor: string) {
    setForm({ ...form, [campo]: valor });
    if (fieldErrors[campo]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[campo];
        return next;
      });
    }
  }

  const nome = (
    <FormField label="Nome" htmlFor="nome" error={fieldErrors.nome} required>
      <Input
        id="nome"
        value={form.nome}
        onChange={(e) => updateField('nome', e.target.value)}
        maxLength={255}
        aria-invalid={fieldErrors.nome ? true : undefined}
        required
      />
    </FormField>
  );
  const numero = (
    <FormField label="Número" htmlFor="numero" error={fieldErrors.numero} required>
      <Input
        id="numero"
        value={form.numero}
        onChange={(e) => updateField('numero', e.target.value)}
        maxLength={50}
        aria-invalid={fieldErrors.numero ? true : undefined}
        required
      />
    </FormField>
  );
  const cnpj = (
    <FormField label="CNPJ" htmlFor="cnpj" error={fieldErrors.cnpj} required>
      <Input
        id="cnpj"
        value={form.cnpj}
        onChange={(e) => updateField('cnpj', e.target.value)}
        maxLength={18}
        aria-invalid={fieldErrors.cnpj ? true : undefined}
        required
      />
    </FormField>
  );
  const logoUrl = (
    <FormField label="URL do logo" htmlFor="logo_url" error={fieldErrors.logo_url}>
      <Input
        id="logo_url"
        placeholder="https://"
        value={form.logo_url ?? ''}
        onChange={(e) => updateField('logo_url', e.target.value)}
        maxLength={500}
        aria-invalid={fieldErrors.logo_url ? true : undefined}
      />
    </FormField>
  );
  const telefone = (
    <FormField label="Telefone" htmlFor="telefone" error={fieldErrors.telefone}>
      <Input
        id="telefone"
        value={form.telefone ?? ''}
        onChange={(e) => updateField('telefone', e.target.value)}
        maxLength={20}
        aria-invalid={fieldErrors.telefone ? true : undefined}
      />
    </FormField>
  );
  const email = (
    <FormField label="E-mail" htmlFor="email" error={fieldErrors.email}>
      <Input
        id="email"
        type="email"
        value={form.email ?? ''}
        onChange={(e) => updateField('email', e.target.value)}
        maxLength={255}
        aria-invalid={fieldErrors.email ? true : undefined}
      />
    </FormField>
  );
  const pixChave = (
    <FormField label="Chave PIX" htmlFor="pix_chave" error={fieldErrors.pix_chave}>
      <Input
        id="pix_chave"
        value={form.pix_chave ?? ''}
        onChange={(e) => updateField('pix_chave', e.target.value)}
        maxLength={255}
        aria-invalid={fieldErrors.pix_chave ? true : undefined}
      />
    </FormField>
  );
  const pixDescricao = (
    <FormField label="Descrição do PIX" htmlFor="pix_descricao" error={fieldErrors.pix_descricao}>
      <Input
        id="pix_descricao"
        value={form.pix_descricao ?? ''}
        onChange={(e) => updateField('pix_descricao', e.target.value)}
        maxLength={255}
        aria-invalid={fieldErrors.pix_descricao ? true : undefined}
      />
    </FormField>
  );

  const errorAlert = saveError && (
    <div ref={errorRef}>
      <Alert variant="error">Não foi possível salvar os dados. {saveError}</Alert>
    </div>
  );

  if (formId) {
    // Modal largo (size="xl"): Nome | Número | CNPJ numa linha, contato e
    // PIX lado a lado; 1 coluna abaixo de `sm`. Sem "URL do logo": no
    // cadastro ela segue vazia (enviada como null) e é definida depois.
    return (
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-2">
        {errorAlert}
        <ModalFieldGroup title="Informações gerais" className="sm:grid-cols-6">
          <div className="sm:col-span-3">{nome}</div>
          <div className="sm:col-span-1">{numero}</div>
          <div className="sm:col-span-2">{cnpj}</div>
        </ModalFieldGroup>
        <ModalFieldGroup title="Contato" className="sm:grid-cols-2">
          {telefone}
          {email}
        </ModalFieldGroup>
        <ModalFieldGroup title="PIX" className="sm:grid-cols-2">
          {pixChave}
          {pixDescricao}
        </ModalFieldGroup>
      </form>
    );
  }

  return (
    <>
      {errorAlert}
      <FormCard onSubmit={handleSubmit}>
        <FormSection title="Informações gerais" description="Identificação institucional da Loja.">
          {nome}
          {numero}
          {cnpj}
          {logoUrl}
        </FormSection>

        <FormSection title="Contato" description="Canais de comunicação da Loja.">
          {telefone}
          {email}
        </FormSection>

        <FormSection title="PIX" description="Usado na emissão de documentos e cobranças.">
          {pixChave}
          {pixDescricao}
        </FormSection>

        <FormActions>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : submitLabel}
          </Button>
        </FormActions>
      </FormCard>
    </>
  );
}
