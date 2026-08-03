import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Input } from '../../components';
import { AuthLayout } from '../../components/auth';
import { AUTH_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { isDemoAllowed, isSupabaseConfigured } from '../../lib/supabase';
import { cn, getSafeRedirectPath } from '../../utils';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, enterDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = getSafeRedirectPath(
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname,
    AUTH_ROUTES.home,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const message = await signIn(email, password, rememberMe);
    setSubmitting(false);

    if (message) {
      setError(message);
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  const handleDemoEnter = () => {
    enterDemo('admin');
    navigate(redirectTo, { replace: true });
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout
        title="로그인"
        description="Supabase 연결 전이라도 미리보기로 화면을 확인할 수 있습니다."
      >
        <div className="space-y-4">
          <Alert tone="warning" title="설정 필요">
            프로젝트 루트의 `.env` 파일에 아래 값을 넣어 주세요.
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
              <li>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  Supabase Dashboard
                </a>
                에서 프로젝트 생성
              </li>
              <li>Project Settings → API 이동</li>
              <li>
                <code className="rounded bg-black/5 px-1">Project URL</code> →{' '}
                <code className="rounded bg-black/5 px-1">VITE_SUPABASE_URL</code>
              </li>
              <li>
                <code className="rounded bg-black/5 px-1">anon public</code> key →{' '}
                <code className="rounded bg-black/5 px-1">
                  VITE_SUPABASE_ANON_KEY
                </code>
              </li>
              <li>
                저장 후 터미널에서 <code className="rounded bg-black/5 px-1">npm run dev</code>{' '}
                재시작
              </li>
            </ol>
          </Alert>

          {isDemoAllowed ? (
            <Button type="button" className="w-full" onClick={handleDemoEnter}>
              미리보기로 입장 (관리자)
            </Button>
          ) : (
            <Alert tone="danger" title="데모 비활성">
              프로덕션 빌드에서는 미리보기 입장이 비활성화됩니다.
            </Alert>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="로그인"
      description="교회 방 예약 시스템에 접속합니다."
      footer={
        <>
          계정이 없으신가요?{' '}
          <Link
            to={AUTH_ROUTES.signup}
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            회원가입
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <Alert tone="danger" title="로그인 실패">
            {error}
          </Alert>
        ) : null}

        <Input
          label="이메일"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@church.org"
          required
        />

        <Input
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          required
        />

        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className={cn(
                'h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand)]',
                'focus:ring-[var(--color-brand)]',
              )}
            />
            자동 로그인
          </label>
          <Link
            to={AUTH_ROUTES.forgotPassword}
            className="text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            비밀번호 찾기
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </Button>
      </form>
    </AuthLayout>
  );
}
