// Edge Function: sla-monitor
// Chiamata da pg_cron ogni ora per inviare notifiche SLA warning e breach.
// Richiede CRON_SECRET per evitare chiamate non autorizzate.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // Verifica secret
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // Carica tutte le fasi aperte con SLA configurato
  const { data: openPhases } = await supabase
    .from('pratica_phases')
    .select(`
      id, pratica_id, phase_code, phase_label,
      responsible_id, started_at, sla_hours, sla_breached,
      pratiche ( practice_code, current_responsible ),
      profiles!pratica_phases_responsible_id_fkey ( id, full_name )
    `)
    .is('ended_at', null)
    .gt('sla_hours', 0)

  if (!openPhases?.length) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  const now = new Date()
  const notificationsToInsert: Record<string, unknown>[] = []
  const breachedPhaseIds: string[] = []

  for (const phase of openPhases) {
    const startedAt = new Date(phase.started_at)
    const hoursElapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
    const ratio = hoursElapsed / phase.sla_hours
    const recipientId = phase.responsible_id

    if (!recipientId) continue

    const practiceCode = (phase.pratiche as { practice_code: string })?.practice_code ?? ''

    if (ratio >= 1 && !phase.sla_breached) {
      // SLA sforato — notifica responsabile + titolare
      notificationsToInsert.push({
        recipient_id: recipientId,
        type: 'sla_breach',
        title: `SLA sforato — ${practiceCode}`,
        body: `La fase "${phase.phase_label}" ha superato le ${phase.sla_hours}h previste.`,
        action_url: `/pratiche/${phase.pratica_id}`,
        read: false,
      })

      // Notifica anche titolari/admin
      const { data: titolari } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['titolare', 'admin'])
        .neq('id', recipientId)

      for (const t of titolari ?? []) {
        notificationsToInsert.push({
          recipient_id: t.id,
          type: 'sla_breach',
          title: `SLA sforato — ${practiceCode}`,
          body: `La fase "${phase.phase_label}" (resp. ${(phase.profiles as { full_name: string })?.full_name}) ha superato le ${phase.sla_hours}h.`,
          action_url: `/pratiche/${phase.pratica_id}`,
          read: false,
        })
      }

      breachedPhaseIds.push(phase.id)
    } else if (ratio >= 0.8 && ratio < 1) {
      // SLA warning (solo se non già notificato nelle ultime 4 ore)
      const { data: existingWarning } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', recipientId)
        .eq('type', 'sla_warning')
        .like('action_url', `%${phase.pratica_id}%`)
        .gte('created_at', new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString())
        .limit(1)

      if (!existingWarning?.length) {
        const remainingHours = Math.round(phase.sla_hours - hoursElapsed)
        notificationsToInsert.push({
          recipient_id: recipientId,
          type: 'sla_warning',
          title: `SLA in scadenza — ${practiceCode}`,
          body: `La fase "${phase.phase_label}" scade tra circa ${remainingHours}h.`,
          action_url: `/pratiche/${phase.pratica_id}`,
          read: false,
        })
      }
    }
  }

  // Inserisce notifiche
  if (notificationsToInsert.length > 0) {
    await supabase.from('notifications').insert(notificationsToInsert)
  }

  // Marca fasi come sla_breached=true
  if (breachedPhaseIds.length > 0) {
    await supabase
      .from('pratica_phases')
      .update({ sla_breached: true })
      .in('id', breachedPhaseIds)
  }

  return new Response(
    JSON.stringify({
      processed: openPhases.length,
      notifications_sent: notificationsToInsert.length,
      breaches_marked: breachedPhaseIds.length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
