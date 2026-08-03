const channel = import.meta.env.VITE_APP_CHANNEL ?? 'dev';
const version = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

/** Shown on non-production builds so testers know this is a preview. */
export function TestBuildBanner() {
  if (channel === 'production') return null;

  const label =
    channel === 'test' ? '테스트 버전' : channel === 'preview' ? '미리보기' : '개발 버전';

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-950 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {label} v{version} · 실제 서비스 전 확인용입니다. 문제 발견 시 관리자에게 알려 주세요.
    </div>
  );
}
