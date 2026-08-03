import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

type BadgeTone = 'neutral' | 'brand' | 'success';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children: ReactNode;
};

const toneClass: Record<BadgeTone, string> = {
  neutral:
    'bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)] ring-[var(--color-border)]',
  brand:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[color-mix(in_oklab,var(--color-brand)_18%,transparent)]',
  success:
    'bg-[color-mix(in_oklab,var(--color-success)_12%,white)] text-[var(--color-success)] ring-[color-mix(in_oklab,var(--color-success)_20%,transparent)] dark:bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)]',
};

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight ring-1 ring-inset',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
