import type { ReactNode } from 'react';
import { cn } from '../../utils';
import { errorTextClass, hintClass, labelClass } from './fieldStyles';

type FieldProps = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={id} className={labelClass}>
          {label}
          {required ? (
            <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className={errorTextClass} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={hintClass}>{hint}</p>
      ) : null}
    </div>
  );
}
