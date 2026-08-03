import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildHtml,
  buildText,
  getSubject,
  sendWithResend,
  type ReservationRow,
  type ProfileRow,
} from '../_shared/reservationEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SELECT_FIELDS = `
  id, user_id, room_id, title, purpose, contact_name, contact_phone,
  start_at, end_at, status, notes, rejection_reason, reminder_sent_at,
  rooms:room_id ( name ),
  departments:department_id ( name )
`;

/**
 * Sends emails for approved reservations that start tomorrow (Pacific/Auckland calendar day).
 * Schedule this function daily in Supabase Dashboard (Cron), e.g. 0 9 * * *
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const cronSecret = Deno.env.get('CRON_SECRET');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Allow service role or matching CRON_SECRET bearer
    const isAuthorized =
      (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized) {
      return json({ error: '권한이 없습니다.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Supabase 환경변수가 없습니다.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const siteName = Deno.env.get('SITE_NAME') || '교회 방 예약';
    const timeZone = Deno.env.get('REMINDER_TIMEZONE') || 'Pacific/Auckland';

    const { startIso, endIso, label } = getTomorrowRange(timeZone);

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(SELECT_FIELDS)
      .eq('status', 'approved')
      .is('reminder_sent_at', null)
      .gte('start_at', startIso)
      .lt('start_at', endIso);

    if (error) {
      return json({ error: error.message }, 500);
    }

    const rows = (reservations ?? []) as unknown as ReservationRow[];
    if (rows.length === 0) {
      return json({ ok: true, date: label, sent: 0, results: [] });
    }

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profileError) {
      return json({ error: profileError.message }, 500);
    }

    const profileMap = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    );

    const results: Array<{ reservationId: string; status: string }> = [];

    for (const reservation of rows) {
      const profile = profileMap.get(reservation.user_id);
      if (!profile?.email) {
        results.push({ reservationId: reservation.id, status: 'skipped_no_email' });
        continue;
      }

      const event = 'reminder' as const;
      const subject = getSubject(event, siteName);
      const extraNote = '내일 예약이 예정되어 있습니다. 시간을 확인해 주세요.';
      const html = buildHtml({
        event,
        reservation,
        recipientName: profile.full_name || reservation.contact_name,
        siteName,
        extraNote,
      });
      const text = buildText({
        event,
        reservation,
        recipientName: profile.full_name || reservation.contact_name,
        siteName,
        extraNote,
      });

      try {
        await sendWithResend({
          to: profile.email,
          subject,
          html,
          text,
        });

        await supabase.from('reservation_email_logs').insert({
          reservation_id: reservation.id,
          user_id: reservation.user_id,
          event,
          to_email: profile.email,
          subject,
          status: 'sent',
        });

        await supabase
          .from('reservations')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', reservation.id);

        results.push({ reservationId: reservation.id, status: 'sent' });
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : '발송 실패';
        await supabase.from('reservation_email_logs').insert({
          reservation_id: reservation.id,
          user_id: reservation.user_id,
          event,
          to_email: profile.email,
          subject,
          status: 'failed',
          error_message: message,
        });
        results.push({ reservationId: reservation.id, status: 'failed' });
      }
    }

    return json({
      ok: true,
      date: label,
      sent: results.filter((item) => item.status === 'sent').length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류';
    return json({ error: message }, 500);
  }
});

function getTomorrowRange(timeZone: string) {
  const now = new Date();
  const todayKey = formatDateKey(now, timeZone);
  const tomorrow = addDaysToDateKey(todayKey, 1);
  const dayAfter = addDaysToDateKey(todayKey, 2);

  // Interpret local midnight boundaries as UTC instants via temporal offset sampling
  const startIso = zonedMidnightToUtcIso(tomorrow, timeZone);
  const endIso = zonedMidnightToUtcIso(dayAfter, timeZone);

  return { startIso, endIso, label: tomorrow };
}

function formatDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function zonedMidnightToUtcIso(dateKey: string, timeZone: string) {
  // Binary-search UTC time that maps to local midnight of dateKey in timeZone
  let low = Date.parse(`${dateKey}T00:00:00.000Z`) - 36 * 60 * 60 * 1000;
  let high = Date.parse(`${dateKey}T00:00:00.000Z`) + 36 * 60 * 60 * 1000;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const key = formatDateKey(new Date(mid), timeZone);
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(mid));
    const hour = Number(timeParts.find((part) => part.type === 'hour')?.value);
    const minute = Number(
      timeParts.find((part) => part.type === 'minute')?.value,
    );
    const second = Number(
      timeParts.find((part) => part.type === 'second')?.value,
    );

    if (key < dateKey || (key === dateKey && (hour > 0 || minute > 0 || second > 0))) {
      high = mid;
    } else if (key > dateKey) {
      low = mid + 1;
    } else if (hour === 0 && minute === 0 && second === 0) {
      return new Date(mid).toISOString();
    } else {
      high = mid;
    }
  }

  return new Date(low).toISOString();
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
