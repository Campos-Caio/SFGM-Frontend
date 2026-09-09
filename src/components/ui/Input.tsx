import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

/** Classe compartilhada por inputs/textareas/selects do design system. */
export const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'transition-colors focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 ' +
  'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

/** Campo de texto de linha única do design system. */
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

/** Alias histórico de Input, mantido para telas ainda não migradas. */
export const TextInput = Input;

/** Área de texto multi-linha do design system. */
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`${inputClass} resize-y ${className}`} {...rest} />;
}

export const TextArea = Textarea;
