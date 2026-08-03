/** Only allow same-app relative paths (block open redirects). */
export function getSafeRedirectPath(
  candidate: unknown,
  fallback = '/',
): string {
  if (typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (candidate.includes('://')) return fallback;
  return candidate;
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export function clampText(value: string, max: number) {
  return value.trim().slice(0, max);
}
