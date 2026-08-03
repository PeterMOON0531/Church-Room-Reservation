import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '../common';
import { AUTH_ROUTES } from '../../constants';

type AuthLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            to={AUTH_ROUTES.login}
            className="inline-flex items-center gap-2.5 text-[var(--color-fg)]"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-sm font-bold text-[var(--color-brand-fg)] shadow-[var(--shadow-xs)]">
              C
            </span>
            <span className="text-base font-semibold tracking-tight">
              대한예수교 장로회 평강교회 방 예약
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardBody>{children}</CardBody>
        </Card>

        {footer ? (
          <div className="mt-4 text-center text-sm text-[var(--color-fg-muted)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
