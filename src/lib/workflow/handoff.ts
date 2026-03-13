import { createClient } from '@/lib/supabase/client'
import type { Pratica } from '@/types/database'

export interface HandoffResult {
  pratica: Pratica
  isCompleted: boolean
}

/**
 * Chiama la Edge Function trigger-handoff per avanzare la pratica alla fase successiva.
 * Lancia un errore con messaggio leggibile in caso di fallimento.
 */
export async function triggerHandoff(
  praticaId: string,
  notes?: string
): Promise<HandoffResult> {
  const supabase = createClient()

  const { data, error } = await supabase.functions.invoke('trigger-handoff', {
    body: { pratica_id: praticaId, notes: notes ?? '' },
  })

  if (error) {
    throw new Error(error.message || 'Errore durante il passaggio di fase')
  }

  if (!data?.pratica) {
    throw new Error('Risposta inattesa dalla funzione di handoff')
  }

  return {
    pratica: data.pratica as Pratica,
    isCompleted: data.is_completed ?? false,
  }
}
