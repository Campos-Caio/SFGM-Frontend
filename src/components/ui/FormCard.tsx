import type { FormHTMLAttributes, ReactNode } from 'react';
import { CardHeader } from './Card';

interface FormCardProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

/**
 * Container raiz de um formulário de cadastro/edição: apenas espaçamento
 * vertical entre seções (FormSection) e ações (FormActions) — largura
 * confortável de leitura, sem repetir o card de cada seção.
 */
export function FormCard({ children, className = '', ...rest }: FormCardProps) {
  return (
    <form className={`flex flex-col gap-6 max-w-2xl ${className}`} {...rest}>
      {children}
    </form>
  );
}

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/**
 * Agrupamento visual de campos relacionados dentro de um formulário (ex.:
 * "Informações pessoais", "Contato"), com título e descrição curta.
 */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <CardHeader title={title} description={description} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
