import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildHtml,
  buildText,
  getSubject,
  sendWithResend,
  type ReservationEmailEvent,
  type ReservationRow,
  type ProfileRow,
} from '../_shared/reservationEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  event: ReservationEmailEvent;
  reservationId?: string;
  reservationIds?: string[];
  rejectionReason?: string | null;
};

const ALLOWED_EVENTS = new Set<ReservationEmailEvent>([
  'created',
  'approved',
  'cancelled',
  'updated',
  'reminder',
]);

const SELECT_FIELDS = `
  id, user_id, room_id, title, purpose, contact_name, contact_phone,
  start_at, end_at, status, notes, rejection_reason, reminder_sent_at,
  rooms:room_id ( name ),
  departments:department_id ( name )
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'Supabase 환경변수가 없습니다.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: '인증이 필요합니다.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: '유효하지 않은 세션입니다.' }, 401);
    }

    const body = (await req.json()) as RequestBody;
    const event = body.event;
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return json({ error: '지원하지 않는 이벤트입니다.' }, 400);
    }

    // Reminder emails are cron-only
    if (event === 'reminder') {
      return json({ error: '하루 전 알림은 스케줄 전용입니다.' }, 403);
    }

    const ids = [
      ...(body.reservationId ? [body.reservationId] : []),
      ...(body.reservationIds ?? []),
    ].filter(Boolean);

    if (ids.length === 0) {
      return json({ error: 'reservationId가 필요합니다.' }, 400);
    }

    if (ids.length > 52) {
      return json({ error: '한 번에 너무 많은 예약입니다.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id, role, department_id, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.is_active === false) {
      return json({ error: '비활성 계정입니다.' }, 403);
    }

    const siteName = Deno.env.get('SITE_NAME') || '교회 방 예약';

    const { data: reservations, error: reservationError } = await admin
      .from('reservations')
      .select(SELECT_FIELDS)
      .in('id', ids);

    if (reservationError) {
      return json({ error: reservationError.message }, 500);
    }

    const rows = (reservations ?? []) as unknown as ReservationRow[];
    if (rows.length === 0) {
      return json({ error: '예약을 찾을 수 없습니다.' }, 404);
    }

    const isAdmin = callerProfile.role === 'admin';
    const isHead = callerProfile.role === 'department_head';

    for (const reservation of rows) {
      const isOwner = reservation.user_id === user.id;

      const { data: raw } = await admin
        .from('reservations')
        .select('department_id, status')
        .eq('id', reservation.id)
        .maybeSingle();

      const deptOk =
        isHead &&
        Boolean(raw?.department_id) &&
        raw?.department_id === callerProfile.department_id;

      if (!isOwner && !isAdmin && !deptOk) {
        return json({ error: '이 예약에 대한 권한이 없습니다.' }, 403);
      }

      if (
        event === 'approved' &&
        reservation.status !== 'approved' &&
        !isAdmin &&
        !deptOk
      ) {
        return json({ error: '승인되지 않은 예약입니다.' }, 400);
      }

      if (
        event === 'cancelled' &&
        !['cancelled', 'rejected'].includes(reservation.status) &&
        !isOwner &&
        !isAdmin &&
        !deptOk
      ) {
        return json({ error: '취소되지 않은 예약입니다.' }, 400);
      }
    }

    // Rate limit: max 20 emails / user / 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('reservation_email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);

    if ((count ?? 0) >= 20) {
      return json({ error: '이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도하세요.' }, 429);
    }

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: profiles, error: profileError } = await admin
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

      const extraNote =
        event === 'created' && rows.length > 1
          ? `반복 예약 ${rows.length}건이 접수되었습니다. 본 메일은 대표 일정 안내입니다.`
          : event === 'cancelled' && body.rejectionReason
            ? `취소/거절 사유: ${body.rejectionReason}`
            : null;

      const subject = getSubject(event, siteName);
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

        await admin.from('reservation_email_logs').insert({
          reservation_id: reservation.id,
          user_id: reservation.user_id,
          event,
          to_email: profile.email,
          subject,
          status: 'sent',
        });

        results.push({ reservationId: reservation.id, status: 'sent' });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '발송 실패';
        await admin.from('reservation_email_logs').insert({
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

      if (event === 'created' && rows.length > 1) {
        break;
      }
    }

    return json({ ok: true, results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
