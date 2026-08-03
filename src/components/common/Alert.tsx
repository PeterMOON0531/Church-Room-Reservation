import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
};

const toneClass: Record<AlertTone, string> = {
  info: 'border-[color-mix(in_oklab,var(--color-brand)_28%,var(--color-border))] bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
  success:
    'border-[color-mix(in_oklab,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-success)_10%,var(--color-surface))] text-[var(--color-success)]',
  warning:
    'border-[color-mix(in_oklab,var(--color-warning)_28%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-warning)_10%,var(--color-surface))] text-[var(--color-warning)]',
  danger:
    'border-[color-mix(in_oklab,var(--color-danger)_28%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-danger)_10%,var(--color-surface))] text-[var(--color-danger)]',
};

export function Alert({
  tone = 'info',
  title,
  children,
  onClose,
  className,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-[var(--radius-lg)] border px-4 py-3 shadow-[var(--shadow-xs)]',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <div className={cn('pr-8', !onClose && 'pr-0')}>
        {title ? (
          <p className="text-sm font-semibold tracking-tight">{title}</p>
        ) : null}
        <div
          className={cn(
            'text-sm leading-relaxed',
            title ? 'mt-1 opacity-90' : 'font-medium',
          )}
        >
          {children}
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label="알림 닫기"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
