import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white border border-transparent hover:bg-blue-700 active:bg-blue-800',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  outline:
    'bg-transparent text-blue-700 border border-blue-200 hover:bg-blue-50 active:bg-blue-100',
  ghost:
    'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-600 text-white border border-transparent hover:bg-red-700 active:bg-red-800',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const base =
  'inline-flex items-center justify-center rounded-md font-medium text-center cursor-pointer transition-colors whitespace-nowrap select-none no-underline ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className: string) {
  return `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

/** Renderiza o conteúdo do botão, com ícone opcional alinhado ao texto. */
function buttonContent(icon: LucideIcon | undefined, size: ButtonSize, children: ReactNode) {
  if (!icon) return children;
  const Icon = icon;
  return (
    <>
      <Icon size={iconSizes[size]} aria-hidden="true" className="shrink-0" />
      {children}
    </>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone opcional (componente do lucide-react) exibido antes do texto. */
  icon?: LucideIcon;
  children: ReactNode;
}

/** Botão de ação/submit padrão do design system. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {buttonContent(icon, size, children)}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  /** Estado de navegação repassado ao <Link> (ex.: contexto para a tela de destino). */
  state?: LinkProps['state'];
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone opcional (componente do lucide-react) exibido antes do texto. */
  icon?: LucideIcon;
  children: ReactNode;
}

/** Botão de navegação (renderiza <Link>), mesma aparência de Button. */
export function LinkButton({
  to,
  state,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link to={to} state={state} className={buttonClasses(variant, size, className)} {...rest}>
      {buttonContent(icon, size, children)}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Obrigatório: botões apenas com ícone precisam de um rótulo acessível. */
  'aria-label': string;
}

const iconButtonSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

/** Botão compacto apenas com ícone (ex.: acionador de menu de ações, hambúrguer). */
export function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={`${base} ${variantClasses[variant]} ${iconButtonSizeClasses[size]} ${className}`}
      {...rest}
    >
      <Icon size={iconSizes[size]} aria-hidden="true" />
    </button>
  );
}
