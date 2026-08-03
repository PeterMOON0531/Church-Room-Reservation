import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Input } from '../../components';
import { AuthLayout } from '../../components/auth';
import { AUTH_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { isSupabaseConfigured } from '../../lib/supabase';

export function SignupPage() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    const message = await signUp(email, password, fullName);
    setSubmitting(false);

    if (message) {
      setError(message);
      return;
    }

    setSuccess(
      '회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요. 기본 권한은 일반사용자입니다.',
    );
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout title="회원가입" description="Supabase 환경 변수가 필요합니다.">
        <Alert tone="warning" title="설정 필요">
          `.env` 파일에 Supabase 키를 설정해 주세요.
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="회원가입"
      description="새 계정을 만들고 방 예약을 시작하세요."
      footer={
        <>
          이미 계정이 있으신가요?{' '}
          <Link
            to={AUTH_ROUTES.login}
            className="font-semibold text-[var(--color-brand)] hover:underline"
          >
            로그인
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <Alert tone="danger" title="회원가입 실패">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert tone="success" title="가입 완료">
            {success}
          </Alert>
        ) : null}

        <Input
          label="이름"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="홍길동"
          required
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8자 이상"
          hint="8자 이상 입력해 주세요."
          required
        />
        <Input
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="비밀번호 재입력"
          required
        />

        <Button type="submit" className="w-full" disabled={submitting || Boolean(success)}>
          {submitting ? '가입 중...' : '회원가입'}
        </Button>
      </form>
    </AuthLayout>
  );
}
