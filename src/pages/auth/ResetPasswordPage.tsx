import { Link, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Input } from '../../components';
import { AuthLayout } from '../../components/auth';
import { AUTH_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { isSupabaseConfigured } from '../../lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { changePassword, session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    const message = await changePassword(password);
    setSubmitting(false);

    if (message) {
      setError(message);
      return;
    }

    navigate(AUTH_ROUTES.login, { replace: true });
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout title="비밀번호 재설정" description="Supabase 환경 변수가 필요합니다.">
        <Alert tone="warning" title="설정 필요">
          `.env` 파일에 Supabase 키를 설정해 주세요.
        </Alert>
      </AuthLayout>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--color-fg-muted)]">
        세션 확인 중...
      </div>
    );
  }

  if (!session) {
    return (
      <AuthLayout
        title="비밀번호 재설정"
        description="재설정 링크가 만료되었거나 유효하지 않습니다."
      >
        <Alert tone="warning" title="세션 없음">
          이메일의 재설정 링크를 다시 열거나 비밀번호 찾기를 요청해 주세요.
        </Alert>
        <div className="mt-4">
          <Link
            to={AUTH_ROUTES.forgotPassword}
            className="text-sm font-semibold text-[var(--color-brand)] hover:underline"
          >
            비밀번호 찾기
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="새 비밀번호 설정" description="새 비밀번호를 입력해 주세요.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <Alert tone="danger" title="변경 실패">
            {error}
          </Alert>
        ) : null}

        <Input
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8자 이상"
          required
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="비밀번호 재입력"
          required
        />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '저장 중...' : '비밀번호 변경'}
        </Button>
      </form>
    </AuthLayout>
  );
}
