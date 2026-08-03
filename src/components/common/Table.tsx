import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../utils';

type TableProps = HTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

export function Table({ className, children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]">
      <table
        className={cn('w-full min-w-[36rem] border-collapse text-left text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

type TableSectionProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

export function TableHeader({ className, children, ...props }: TableSectionProps) {
  return (
    <thead
      className={cn(
        'bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: TableSectionProps) {
  return (
    <tbody className={cn('divide-y divide-[var(--color-border)]', className)} {...props}>
      {children}
    </tbody>
  );
}

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
};

export function TableRow({ className, children, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand-soft)_55%,transparent)]',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
};

export function TableHead({ className, children, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
};

export function TableCell({ className, children, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 text-[var(--color-fg)] whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
