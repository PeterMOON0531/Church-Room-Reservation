import { cn } from '../../utils';

type LoadingBlockProps = {
  label?: string;
  className?: string;
  rows?: number;
};

export function LoadingBlock({
  label = '불러오는 중...',
  className,
  rows = 3,
}: LoadingBlockProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-sm text-[var(--color-fg-muted)]">{label}</p>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded-full bg-[var(--color-surface-muted)]"
            style={{ width: `${88 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
