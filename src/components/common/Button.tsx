import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand)] text-[var(--color-brand-fg)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-brand-hover)]',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-border-strong)]',
  ghost:
    'text-[var(--color-fg-muted)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-fg)]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold tracking-tight transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ds-ease)] disabled:pointer-events-none disabled:opacity-50',
        'active:translate-y-px',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
