import type { ReservationEmailEvent } from '../../types';
import { formatDateTimeRange } from '../../utils';

export type EmailReservationSummary = {
  room_name?: string | null;
  department_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  purpose?: string | null;
  title?: string | null;
  notes?: string | null;
  start_at: string;
  end_at: string;
  status?: string;
  rejection_reason?: string | null;
};

const EVENT_TITLES: Record<ReservationEmailEvent, string> = {
  created: '예약이 접수되었습니다',
  approved: '예약이 승인되었습니다',
  cancelled: '예약이 취소되었습니다',
  updated: '예약이 변경되었습니다',
  reminder: '예약 하루 전 안내',
};

export function getReservationEmailSubject(
  event: ReservationEmailEvent,
  siteName = '교회 방 예약',
) {
  return `[${siteName}] ${EVENT_TITLES[event]}`;
}

export function buildReservationEmailHtml(options: {
  event: ReservationEmailEvent;
  reservation: EmailReservationSummary;
  recipientName?: string | null;
  siteName?: string;
  extraNote?: string | null;
}) {
  const {
    event,
    reservation,
    recipientName,
    siteName = '교회 방 예약',
    extraNote,
  } = options;
  const greeting = recipientName?.trim()
    ? `${recipientName.trim()}님, 안녕하세요.`
    : '안녕하세요.';
  const schedule = formatDateTimeRange(reservation.start_at, reservation.end_at);
  const purpose = reservation.purpose?.trim() || reservation.title || '-';

  return `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:20px 24px;background:#1d4ed8;color:#ffffff;">
              <div style="font-size:14px;opacity:.9;">${siteName}</div>
              <div style="font-size:20px;font-weight:700;margin-top:4px;">${EVENT_TITLES[event]}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 20px;line-height:1.6;">아래 예약 내용을 확인해 주세요.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;width:96px;">방</td>
                  <td style="padding:8px 0;font-weight:600;">${reservation.room_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">일시</td>
                  <td style="padding:8px 0;font-weight:600;">${schedule}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">부서</td>
                  <td style="padding:8px 0;">${reservation.department_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">예약자</td>
                  <td style="padding:8px 0;">${reservation.contact_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">연락처</td>
                  <td style="padding:8px 0;">${reservation.contact_phone || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;">사용목적</td>
                  <td style="padding:8px 0;">${purpose}</td>
                </tr>
                ${
                  reservation.notes?.trim()
                    ? `<tr>
                  <td style="padding:8px 0;color:#6b7280;">비고</td>
                  <td style="padding:8px 0;">${reservation.notes.trim()}</td>
                </tr>`
                    : ''
                }
                ${
                  event === 'cancelled' && reservation.rejection_reason?.trim()
                    ? `<tr>
                  <td style="padding:8px 0;color:#6b7280;">사유</td>
                  <td style="padding:8px 0;">${reservation.rejection_reason.trim()}</td>
                </tr>`
                    : ''
                }
              </table>
              ${
                extraNote
                  ? `<p style="margin:20px 0 0;padding:12px;background:#f8fafc;border-radius:8px;line-height:1.6;font-size:14px;">${extraNote}</p>`
                  : ''
              }
              <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
                본 메일은 예약 시스템에 의해 자동 발송되었습니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildReservationEmailText(options: {
  event: ReservationEmailEvent;
  reservation: EmailReservationSummary;
  recipientName?: string | null;
  siteName?: string;
  extraNote?: string | null;
}) {
  const {
    event,
    reservation,
    recipientName,
    siteName = '교회 방 예약',
    extraNote,
  } = options;
  const greeting = recipientName?.trim()
    ? `${recipientName.trim()}님, 안녕하세요.`
    : '안녕하세요.';
  const schedule = formatDateTimeRange(reservation.start_at, reservation.end_at);
  const purpose = reservation.purpose?.trim() || reservation.title || '-';

  return [
    `[${siteName}] ${EVENT_TITLES[event]}`,
    '',
    greeting,
    '아래 예약 내용을 확인해 주세요.',
    '',
    `방: ${reservation.room_name || '-'}`,
    `일시: ${schedule}`,
    `부서: ${reservation.department_name || '-'}`,
    `예약자: ${reservation.contact_name || '-'}`,
    `연락처: ${reservation.contact_phone || '-'}`,
    `사용목적: ${purpose}`,
    reservation.notes?.trim() ? `비고: ${reservation.notes.trim()}` : null,
    extraNote || null,
    '',
    '본 메일은 예약 시스템에 의해 자동 발송되었습니다.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
