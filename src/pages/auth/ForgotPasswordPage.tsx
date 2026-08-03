import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Input } from '../../components';
import { AuthLayout } from '../../components/auth';
import { AUTH_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { isSupabaseConfigured } from '../../lib/supabase';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const message = await resetPassword(email);
    setSubmitting(false);

    if (message) {
      setError(message);
      return;
    }

    setSuccess('비밀번호 재설정 링크를 이메일로 보냈습니다.');
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout title="비밀번호 찾기" description="Supabase 환경 변수가 필요합니다.">
        <Alert tone="warning" title="설정 필요">
          `.env` 파일에 Supabase 키를 설정해 주세요.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="비밀번호 찾기"
      description="가입한 이메일로 재설정 링크를 보내드립니다."
      footer={
        <Link
          to={AUTH_ROUTES.login}
          className="font-semibold text-[var(--color-brand)] hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <Alert tone="danger" title="요청 실패">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert tone="success" title="메일 발송">
            {success}
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

        <Button type="submit" className="w-full" disabled={submitting || Boolean(success)}>
          {submitting ? '전송 중...' : '재설정 링크 보내기'}
        </Button>
      </form>
    </AuthLayout>
  );
}
