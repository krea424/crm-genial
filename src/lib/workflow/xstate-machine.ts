import { createMachine, assign } from 'xstate'
import type { Pratica, PraticaPhase, WorkflowTemplate, Profile } from '@/types/database'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface PraticaContext {
  pratica: Pratica | null
  phases: PraticaPhase[]
  templates: WorkflowTemplate[]
  currentUser: Profile | null
  handoffNotes: string
  error: string | null
}

export type PraticaEvent =
  | { type: 'LOAD'; praticaId: string }
  | { type: 'LOAD_SUCCESS'; pratica: Pratica; phases: PraticaPhase[]; templates: WorkflowTemplate[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'START_HANDOFF' }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'CONFIRM_HANDOFF' }
  | { type: 'CANCEL_HANDOFF' }
  | { type: 'HANDOFF_SUCCESS'; pratica: Pratica }
  | { type: 'HANDOFF_ERROR'; error: string }
  | { type: 'RETRY' }

// ─── Guard ────────────────────────────────────────────────────────────────────

/** L'utente corrente è il responsabile della pratica */
function canHandoff({ context }: { context: PraticaContext }): boolean {
  if (!context.pratica || !context.currentUser) return false
  if (context.pratica.status !== 'attiva') return false
  if (context.currentUser.role === 'titolare' || context.currentUser.role === 'admin') return true
  return context.pratica.current_responsible === context.currentUser.id
}

/** Esiste ancora una fase successiva (la pratica non è all'ultima fase) */
function hasNextPhase({ context }: { context: PraticaContext }): boolean {
  if (!context.pratica || !context.templates.length) return false
  const ordered = [...context.templates].sort((a, b) => a.phase_order - b.phase_order)
  const currentIdx = ordered.findIndex(t => t.phase_code === context.pratica!.current_phase_code)
  return currentIdx >= 0 && currentIdx < ordered.length - 1
}

// ─── Machine ──────────────────────────────────────────────────────────────────

export const praticaMachine = createMachine(
  {
    id: 'pratica',
    types: {} as {
      context: PraticaContext
      events: PraticaEvent
    },
    initial: 'idle',
    context: {
      pratica: null,
      phases: [],
      templates: [],
      currentUser: null,
      handoffNotes: '',
      error: null,
    },
    states: {
      idle: {
        on: {
          LOAD: 'loading',
        },
      },
      loading: {
        on: {
          LOAD_SUCCESS: {
            target: 'viewing',
            actions: assign({
              pratica: ({ event }) => event.pratica,
              phases: ({ event }) => event.phases,
              templates: ({ event }) => event.templates,
              error: () => null,
            }),
          },
          LOAD_ERROR: {
            target: 'error',
            actions: assign({ error: ({ event }) => event.error }),
          },
        },
      },
      viewing: {
        on: {
          START_HANDOFF: {
            target: 'confirming_handoff',
            guard: canHandoff,
          },
          LOAD: 'loading',
        },
      },
      confirming_handoff: {
        on: {
          SET_NOTES: {
            actions: assign({ handoffNotes: ({ event }) => event.notes }),
          },
          CONFIRM_HANDOFF: {
            target: 'executing_handoff',
            guard: canHandoff,
          },
          CANCEL_HANDOFF: {
            target: 'viewing',
            actions: assign({ handoffNotes: () => '' }),
          },
        },
      },
      executing_handoff: {
        on: {
          HANDOFF_SUCCESS: {
            target: 'viewing',
            actions: assign({
              pratica: ({ event }) => event.pratica,
              handoffNotes: () => '',
            }),
          },
          HANDOFF_ERROR: {
            target: 'confirming_handoff',
            actions: assign({ error: ({ event }) => event.error }),
          },
        },
      },
      error: {
        on: {
          RETRY: 'loading',
        },
      },
    },
  },
  {
    guards: {
      canHandoff,
      hasNextPhase,
    },
  }
)
