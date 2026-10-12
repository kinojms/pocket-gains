// Called every 15 minutes by pg_cron with the project's secret key (see README).
// Deploy with --no-verify-jwt; @supabase/server checks the secret key instead.
import { withSupabase } from 'npm:@supabase/server@^1'
import webpush from 'npm:web-push@^3.6.7'
import { dueNotifications, type DueProfile, type DueSession, type DueState } from './due.ts'

webpush.setVapidDetails(
  `mailto:${Deno.env.get('VAPID_CONTACT_EMAIL')}`,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const admin = ctx.supabaseAdmin
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const [profiles, states, sessions, subs] = await Promise.all([
      admin.from('profile')
        .select('user_id, pet_name, timezone, reminder_enabled, reminder_time, nudge_enabled, reminder_days')
        .or('reminder_enabled.eq.true,nudge_enabled.eq.true'),
      admin.from('reminder_state').select('user_id, last_reminded_on, last_nudged_on'),
      admin.from('session').select('user_id, started_at').gte('started_at', since),
      admin.from('push_subscription').select('endpoint, user_id, p256dh, auth'),
    ])
    const failed = profiles.error ?? states.error ?? sessions.error ?? subs.error
    if (failed) return Response.json({ error: failed.message }, { status: 500 })

    const due = dueNotifications({
      now: new Date(),
      profiles: profiles.data as DueProfile[],
      states: states.data as DueState[],
      sessions: sessions.data as DueSession[],
    })

    let sent = 0
    for (const n of due) {
      for (const s of subs.data.filter((x) => x.user_id === n.userId)) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: n.title, body: n.body, tag: n.kind }),
          )
          sent++
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          // Expired or revoked subscription: remove it and carry on with everyone else.
          if (status === 404 || status === 410) await admin.from('push_subscription').delete().eq('endpoint', s.endpoint)
          else console.error('push failed', status, e)
        }
      }
      await admin.from('reminder_state').upsert(
        { user_id: n.userId, ...(n.kind === 'reminder' ? { last_reminded_on: n.localDate } : { last_nudged_on: n.localDate }) },
        { onConflict: 'user_id' },
      )
    }
    return Response.json({ due: due.length, sent })
  }),
}
