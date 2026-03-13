// Edge Function: trigger-handoff
// Avanza una pratica alla fase successiva del workflow con audit trail completo.
// Deno runtime — import da esm.sh

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crea client con Service Role per operazioni privilegiate
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Crea client con JWT utente per verificare chi sta facendo l'operazione
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Utente non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Leggi il body
    const body = await req.json()
    const { pratica_id, notes } = body as { pratica_id: string; notes?: string }

    if (!pratica_id) {
      return new Response(JSON.stringify({ error: 'pratica_id obbligatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── 1. Carica la pratica ────────────────────────────────────────────────
    const { data: pratica, error: praticaErr } = await supabaseAdmin
      .from('pratiche')
      .select('*, pratica_types(*)')
      .eq('id', pratica_id)
      .single()

    if (praticaErr || !pratica) {
      return new Response(JSON.stringify({ error: 'Pratica non trovata' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (pratica.status !== 'attiva') {
      return new Response(JSON.stringify({ error: 'La pratica non è attiva' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── 2. Verifica autorizzazione ──────────────────────────────────────────
    const { data: actorProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    const canHandoff =
      actorProfile?.role === 'titolare' ||
      actorProfile?.role === 'admin' ||
      pratica.current_responsible === user.id

    if (!canHandoff) {
      return new Response(
        JSON.stringify({ error: 'Non sei il responsabile corrente di questa pratica' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 3. Carica template fasi ordinate ────────────────────────────────────
    const { data: templates } = await supabaseAdmin
      .from('workflow_templates')
      .select('*')
      .eq('pratica_type_id', pratica.pratica_type_id)
      .order('phase_order', { ascending: true })

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nessun template workflow per questo tipo di pratica' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentIdx = templates.findIndex(t => t.phase_code === pratica.current_phase_code)
    if (currentIdx === -1) {
      return new Response(
        JSON.stringify({ error: 'Fase corrente non trovata nel workflow template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentTemplate = templates[currentIdx]
    const nextTemplate = templates[currentIdx + 1] ?? null
    const isLastPhase = !nextTemplate

    const now = new Date().toISOString()

    // ─── 4. Chiudi fase corrente in pratica_phases ───────────────────────────
    const { data: currentPhase } = await supabaseAdmin
      .from('pratica_phases')
      .select('id, started_at, sla_hours')
      .eq('pratica_id', pratica_id)
      .eq('phase_code', pratica.current_phase_code)
      .is('ended_at', null)
      .single()

    if (currentPhase) {
      const durationMs = new Date(now).getTime() - new Date(currentPhase.started_at).getTime()
      const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2))
      const slaBreached = currentPhase.sla_hours > 0 && durationHours > currentPhase.sla_hours

      await supabaseAdmin
        .from('pratica_phases')
        .update({
          ended_at: now,
          duration_hours: durationHours,
          sla_breached: slaBreached,
          notes: notes ?? null,
        })
        .eq('id', currentPhase.id)
    }

    let newStatus = pratica.status
    let newPhaseCode = pratica.current_phase_code
    let newResponsible = pratica.current_responsible

    if (isLastPhase) {
      // ─── 5a. Ultima fase → completa la pratica ────────────────────────────
      newStatus = 'completata'
      newPhaseCode = null
      newResponsible = null

      await supabaseAdmin
        .from('pratiche')
        .update({
          status: 'completata',
          current_phase_code: null,
          current_responsible: null,
          completed_at: now,
        })
        .eq('id', pratica_id)
    } else {
      // ─── 5b. Avanza alla fase successiva ──────────────────────────────────
      newPhaseCode = nextTemplate.phase_code

      // Trova il profilo con il ruolo default della fase successiva
      const { data: nextResponsibleProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('role', nextTemplate.default_role)
        .limit(1)
        .single()

      newResponsible = nextResponsibleProfile?.id ?? pratica.current_responsible

      // Aggiorna pratica
      await supabaseAdmin
        .from('pratiche')
        .update({
          current_phase_code: newPhaseCode,
          current_responsible: newResponsible,
        })
        .eq('id', pratica_id)

      // Apri nuova riga pratica_phases
      await supabaseAdmin.from('pratica_phases').insert({
        pratica_id,
        phase_code: nextTemplate.phase_code,
        phase_label: nextTemplate.phase_label,
        responsible_id: newResponsible,
        started_at: now,
        sla_hours: nextTemplate.sla_hours,
        sla_breached: false,
      })

      // ─── 6. Notifica il nuovo responsabile ─────────────────────────────────
      if (newResponsible && newResponsible !== user.id) {
        await supabaseAdmin.from('notifications').insert({
          recipient_id: newResponsible,
          type: 'handoff',
          title: `Pratica ${pratica.practice_code} assegnata a te`,
          body: `Sei il nuovo responsabile per la fase "${nextTemplate.phase_label}".${notes ? ` Note: ${notes}` : ''}`,
          action_url: `/pratiche/${pratica_id}`,
          read: false,
        })
      }
    }

    // ─── 7. Audit log ──────────────────────────────────────────────────────
    await supabaseAdmin.from('audit_log').insert({
      entity_type: 'pratica',
      entity_id: pratica_id,
      action: isLastPhase ? 'completed' : 'handoff',
      actor_id: user.id,
      old_data: {
        phase_code: pratica.current_phase_code,
        responsible: pratica.current_responsible,
        status: pratica.status,
      },
      new_data: {
        phase_code: newPhaseCode,
        responsible: newResponsible,
        status: newStatus,
        notes,
      },
    })

    // ─── 8. Restituisci pratica aggiornata ──────────────────────────────────
    const { data: updatedPratica } = await supabaseAdmin
      .from('pratiche')
      .select('*, clients(*), profiles!pratiche_current_responsible_fkey(*), pratica_types(*)')
      .eq('id', pratica_id)
      .single()

    return new Response(
      JSON.stringify({
        pratica: updatedPratica,
        is_completed: isLastPhase,
        next_phase: nextTemplate ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('trigger-handoff error:', err)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
