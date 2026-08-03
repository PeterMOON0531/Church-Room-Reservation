import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CardSectionProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardHeader({ className, children, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        'border-b border-[var(--color-border)] px-5 py-4 sm:px-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardSectionProps) {
  return (
    <h3
      className={cn(
        'text-base font-semibold tracking-tight text-[var(--color-fg)]',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: CardSectionProps) {
  return (
    <p
      className={cn('mt-1 text-sm text-[var(--color-fg-muted)]', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardBody({ className, children, ...props }: CardSectionProps) {
  return (
    <div className={cn('px-5 py-5 sm:px-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:px-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
