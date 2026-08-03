import { cn } from '../../utils';

export const controlBaseClass = cn(
  'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]',
  'px-3 text-sm text-[var(--color-fg)] shadow-[var(--shadow-xs)]',
  'placeholder:text-[var(--color-fg-subtle)]',
  'transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ds-ease)]',
  'hover:border-[var(--color-border-strong)]',
  'focus:border-[var(--color-brand)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_oklab,var(--color-brand)_18%,transparent)]',
  'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-60',
);

export const controlErrorClass =
  'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[color-mix(in_oklab,var(--color-danger)_18%,transparent)]';

export const labelClass =
  'mb-1.5 block text-sm font-medium tracking-tight text-[var(--color-fg)]';

export const hintClass = 'mt-1.5 text-xs text-[var(--color-fg-subtle)]';

export const errorTextClass = 'mt-1.5 text-xs font-medium text-[var(--color-danger)]';
