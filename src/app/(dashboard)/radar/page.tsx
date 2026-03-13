import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getHoursInPhase, getSlaStatus } from '@/utils/sla'
import { RadarBoardRealtime } from '@/components/radar/radar-board-realtime'
import type { RadarColumn, RadarItem, WorkflowTemplate } from '@/types/database'

export const revalidate = 0

export default async function RadarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carica dati in parallelo
  const [praticheRes, templatesRes, profilesRes, praticaTypesRes] = await Promise.all([
    supabase
      .from('pratiche')
      .select(`
        *,
        clients ( id, client_type, first_name, last_name, company_name ),
        profiles!pratiche_current_responsible_fkey ( id, full_name ),
        pratica_types ( id, code, label )
      `)
      .eq('status', 'attiva')
      .not('current_phase_code', 'is', null),
    supabase
      .from('workflow_templates')
      .select('*')
      .order('phase_order', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name'),
    supabase
      .from('pratica_types')
      .select('*')
      .eq('is_active', true)
      .order('label'),
  ])

  const pratiche = praticheRes.data ?? []
  const templates = (templatesRes.data ?? []) as WorkflowTemplate[]
  const profiles = profilesRes.data ?? []
  const praticaTypes = praticaTypesRes.data ?? []

  // Per ogni pratica attiva, cerca la fase corrente aperta
  const phaseStartMap = new Map<string, string>()
  if (pratiche.length > 0) {
    const { data: openPhases } = await supabase
      .from('pratica_phases')
      .select('pratica_id, started_at, phase_code')
      .in('pratica_id', pratiche.map(p => p.id))
      .is('ended_at', null)

    for (const phase of openPhases ?? []) {
      phaseStartMap.set(phase.pratica_id, phase.started_at)
    }
  }

  // Mappa phase_code → template (primo trovato per quel codice)
  const templatesByPhase = new Map<string, WorkflowTemplate>()
  for (const t of templates) {
    if (!templatesByPhase.has(t.phase_code)) {
      templatesByPhase.set(t.phase_code, t)
    }
  }

  // Costruisci colonne Radar
  const phaseMap = new Map<string, { label: string; order: number; items: RadarItem[] }>()

  for (const p of pratiche) {
    const phaseCode = p.current_phase_code!
    const template = templatesByPhase.get(phaseCode)
    const slaHours = template?.sla_hours ?? 0

    const startedAt = phaseStartMap.get(p.id) ?? p.updated_at
    const hoursInPhase = getHoursInPhase(startedAt)
    const slaStatus = getSlaStatus(hoursInPhase, slaHours)

    const radarItem: RadarItem = {
      ...p,
      sla_status: slaStatus,
      hours_in_phase: hoursInPhase,
      sla_hours: slaHours,
    }

    if (!phaseMap.has(phaseCode)) {
      phaseMap.set(phaseCode, {
        label: template?.phase_label ?? phaseCode,
        order: template?.phase_order ?? 999,
        items: [],
      })
    }
    phaseMap.get(phaseCode)!.items.push(radarItem)
  }

  const columns: RadarColumn[] = Array.from(phaseMap.entries())
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([phase_code, { label, items }]) => ({
      phase_code,
      phase_label: label,
      items,
      sla_breaches_count: items.filter(i => i.sla_status === 'breached').length,
    }))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radar</h1>
          <p className="text-gray-500 mt-1">Panoramica di tutte le pratiche attive per fase</p>
        </div>
      </div>

      <RadarBoardRealtime
        initialColumns={columns}
        templates={templates}
        profiles={profiles}
        praticaTypes={praticaTypes}
      />
    </div>
  )
}
