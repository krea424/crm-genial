'use client'

import { useEffect } from 'react'
import { useMachine } from '@xstate/react'
import { praticaMachine } from '@/lib/workflow/xstate-machine'
import { triggerHandoff } from '@/lib/workflow/handoff'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Pratica, PraticaPhase, WorkflowTemplate } from '@/types/database'

export function usePraticaMachine(praticaId: string, currentUser: Profile) {
  const [state, send] = useMachine(praticaMachine, {
    input: { currentUser },
  })

  // Inizializza context con currentUser
  useEffect(() => {
    send({ type: 'LOAD', praticaId })
    loadPratica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  async function loadPratica() {
    send({ type: 'LOAD', praticaId })
    const supabase = createClient()

    const [praticaRes, phasesRes, templatesRes] = await Promise.all([
      supabase
        .from('pratiche')
        .select('*, clients(*), profiles!pratiche_current_responsible_fkey(*), pratica_types(*)')
        .eq('id', praticaId)
        .single(),
      supabase
        .from('pratica_phases')
        .select('*, profiles!pratica_phases_responsible_id_fkey(*)')
        .eq('pratica_id', praticaId)
        .order('started_at', { ascending: true }),
      supabase
        .from('workflow_templates')
        .select('*')
        .order('phase_order', { ascending: true }),
    ])

    if (praticaRes.error) {
      send({ type: 'LOAD_ERROR', error: praticaRes.error.message })
      return
    }

    // Filtra templates per il tipo di pratica corrente
    const pratica = praticaRes.data as Pratica
    const allTemplates = (templatesRes.data ?? []) as WorkflowTemplate[]
    const templates = allTemplates.filter(
      t => t.pratica_type_id === pratica.pratica_type_id
    )

    send({
      type: 'LOAD_SUCCESS',
      pratica,
      phases: (phasesRes.data ?? []) as PraticaPhase[],
      templates,
    })
  }

  async function confirmHandoff() {
    const { handoffNotes, pratica } = state.context
    if (!pratica) return

    try {
      const result = await triggerHandoff(pratica.id, handoffNotes)
      send({ type: 'HANDOFF_SUCCESS', pratica: result.pratica })
    } catch (err) {
      send({
        type: 'HANDOFF_ERROR',
        error: err instanceof Error ? err.message : 'Errore sconosciuto',
      })
    }
  }

  return {
    state,
    send,
    confirmHandoff,
    reload: loadPratica,
    // comodità derivate
    pratica: state.context.pratica,
    phases: state.context.phases,
    templates: state.context.templates,
    error: state.context.error,
    isLoading: state.matches('loading'),
    isViewing: state.matches('viewing'),
    isConfirming: state.matches('confirming_handoff'),
    isExecuting: state.matches('executing_handoff'),
    canHandoff:
      state.matches('viewing') &&
      (currentUser.role === 'titolare' ||
        currentUser.role === 'admin' ||
        state.context.pratica?.current_responsible === currentUser.id),
  }
}
