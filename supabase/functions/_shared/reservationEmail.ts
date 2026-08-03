export type ReservationEmailEvent =
  | 'created'
  | 'approved'
  | 'cancelled'
  | 'updated'
  | 'reminder';

export type ReservationRow = {
  id: string;
  user_id: string;
  room_id: string;
  title: string;
  purpose: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  reminder_sent_at: string | null;
  rooms?: { name: string } | null;
  departments?: { name: string } | null;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
};

const EVENT_TITLES: Record<ReservationEmailEvent, string> = {
  created: '예약이 접수되었습니다',
  approved: '예약이 승인되었습니다',
  cancelled: '예약이 취소되었습니다',
  updated: '예약이 변경되었습니다',
  reminder: '예약 하루 전 안내',
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatSchedule(startAt: string, endAt: string) {
  const timeZone = Deno.env.get('REMINDER_TIMEZONE') || 'Pacific/Auckland';
  const start = new Date(startAt);
  const end = new Date(endAt);
  const date = start.toLocaleDateString('ko-KR', { timeZone });
  const startTime = start.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
  const endTime = end.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
  return `${date} ${startTime} ~ ${endTime}`;
}

export function getSubject(event: ReservationEmailEvent, siteName: string) {
  return `[${siteName}] ${EVENT_TITLES[event]}`;
}

export function buildHtml(options: {
  event: ReservationEmailEvent;
  reservation: ReservationRow;
  recipientName?: string | null;
  siteName: string;
  extraNote?: string | null;
}) {
  const { event, reservation, recipientName, siteName, extraNote } = options;
  const safeSite = escapeHtml(siteName);
  const safeTitle = escapeHtml(EVENT_TITLES[event]);
  const greeting = recipientName?.trim()
    ? `${escapeHtml(recipientName.trim())}님, 안녕하세요.`
    : '안녕하세요.';
  const purpose = escapeHtml(
    reservation.purpose?.trim() || reservation.title || '-',
  );
  const room = escapeHtml(reservation.rooms?.name || '-');
  const department = escapeHtml(reservation.departments?.name || '-');
  const contact = escapeHtml(reservation.contact_name || '-');
  const phone = escapeHtml(reservation.contact_phone || '-');
  const note = extraNote ? escapeHtml(extraNote) : null;

  return `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:20px 24px;background:#1d4ed8;color:#ffffff;">
              <div style="font-size:14px;opacity:.9;">${safeSite}</div>
              <div style="font-size:20px;font-weight:700;margin-top:4px;">${safeTitle}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 20px;line-height:1.6;">아래 예약 내용을 확인해 주세요.</p>
              <table role="presentation" width="100%" style="font-size:14px;">
                <tr><td style="padding:8px 0;color:#6b7280;width:96px;">방</td><td style="padding:8px 0;font-weight:600;">${room}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">일시</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(formatSchedule(reservation.start_at, reservation.end_at))}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">부서</td><td style="padding:8px 0;">${department}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">예약자</td><td style="padding:8px 0;">${contact}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">연락처</td><td style="padding:8px 0;">${phone}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">사용목적</td><td style="padding:8px 0;">${purpose}</td></tr>
              </table>
              ${note ? `<p style="margin:20px 0 0;padding:12px;background:#f8fafc;border-radius:8px;line-height:1.6;font-size:14px;">${note}</p>` : ''}
              <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">본 메일은 예약 시스템에 의해 자동 발송되었습니다.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildText(options: {
  event: ReservationEmailEvent;
  reservation: ReservationRow;
  recipientName?: string | null;
  siteName: string;
  extraNote?: string | null;
}) {
  const { event, reservation, recipientName, siteName, extraNote } = options;
  const greeting = recipientName?.trim()
    ? `${recipientName.trim()}님, 안녕하세요.`
    : '안녕하세요.';
  const purpose = reservation.purpose?.trim() || reservation.title || '-';

  return [
    `[${siteName}] ${EVENT_TITLES[event]}`,
    '',
    greeting,
    '아래 예약 내용을 확인해 주세요.',
    '',
    `방: ${reservation.rooms?.name || '-'}`,
    `일시: ${formatSchedule(reservation.start_at, reservation.end_at)}`,
    `부서: ${reservation.departments?.name || '-'}`,
    `예약자: ${reservation.contact_name || '-'}`,
    `연락처: ${reservation.contact_phone || '-'}`,
    `사용목적: ${purpose}`,
    extraNote || null,
    '',
    '본 메일은 예약 시스템에 의해 자동 발송되었습니다.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export async function sendWithResend(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from =
    Deno.env.get('RESEND_FROM_EMAIL') ||
    '교회 방 예약 <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend 발송 실패: ${detail}`);
  }

  return response.json();
}
