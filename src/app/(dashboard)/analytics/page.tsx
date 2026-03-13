import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import { BottleneckChart } from '@/components/analytics/bottleneck-chart'
import { ConversionChart } from '@/components/analytics/conversion-chart'
import { CapacityTable } from '@/components/analytics/capacity-table'

export const revalidate = 300

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['titolare', 'admin'].includes(profile.role)) {
    redirect('/pratiche')
  }

  const now = new Date()
  const twelveMonthsAgo = subMonths(now, 12).toISOString()
  const sixMonthsAgo = subMonths(now, 6).toISOString()

  // Carica tutti i dati in parallelo
  const [closedPhasesRes, praticheRes, tecniciRes] = await Promise.all([
    // Fasi completate per bottleneck analysis
    supabase
      .from('pratica_phases')
      .select('phase_code, phase_label, duration_hours, sla_hours, sla_breached')
      .not('ended_at', 'is', null)
      .not('duration_hours', 'is', null)
      .gte('started_at', sixMonthsAgo)
      .limit(500),

    // Pratiche ultimi 12 mesi per conversion rate
    supabase
      .from('pratiche')
      .select('status, created_at, opened_at')
      .gte('created_at', twelveMonthsAgo),

    // Tecnici con pratiche attive per capacity planning
    supabase
      .from('profiles')
      .select('id, full_name, weekly_hours')
      .eq('role', 'tecnico'),
  ])

  // Pratiche attive per tecnico
  const { data: praticheTecnici } = await supabase
    .from('pratiche')
    .select('current_responsible')
    .eq('status', 'attiva')
    .not('current_responsible', 'is', null)

  // ─── Bottleneck analysis ──────────────────────────────────────────────────
  const phaseMap = new Map<string, { label: string; hours: number[]; breaches: number }>()

  for (const phase of closedPhasesRes.data ?? []) {
    if (!phase.duration_hours) continue
    if (!phaseMap.has(phase.phase_code)) {
      phaseMap.set(phase.phase_code, { label: phase.phase_label, hours: [], breaches: 0 })
    }
    const entry = phaseMap.get(phase.phase_code)!
    entry.hours.push(phase.duration_hours)
    if (phase.sla_breached) entry.breaches++
  }

  const bottleneckPhases = Array.from(phaseMap.entries())
    .filter(([, v]) => v.hours.length >= 2)
    .map(([, v]) => ({
      phase_label: v.label,
      avg_hours: v.hours.reduce((a, b) => a + b, 0) / v.hours.length,
      count: v.hours.length,
      breach_rate: v.hours.length > 0 ? v.breaches / v.hours.length : 0,
    }))
    .sort((a, b) => b.avg_hours - a.avg_hours)
    .slice(0, 8)

  const maxHours = bottleneckPhases[0]?.avg_hours ?? 1

  // ─── Conversion rate per mese ─────────────────────────────────────────────
  const monthsData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)

    const praticheMese = (praticheRes.data ?? []).filter(p => {
      const created = new Date(p.created_at)
      return created >= start && created <= end
    })

    const leads = praticheMese.length
    const converted = praticheMese.filter(p => p.status !== 'lead').length

    return {
      month: format(d, 'MMM yy', { locale: it }),
      leads,
      converted,
      rate: leads > 0 ? Math.round((converted / leads) * 100) : 0,
    }
  })

  // ─── Capacity planning ────────────────────────────────────────────────────
  const pratichePerTecnico = new Map<string, number>()
  for (const p of praticheTecnici ?? []) {
    if (p.current_responsible) {
      pratichePerTecnico.set(
        p.current_responsible,
        (pratichePerTecnico.get(p.current_responsible) ?? 0) + 1
      )
    }
  }

  const capacityData = (tecniciRes.data ?? []).map(t => {
    const pratiche_attive = pratichePerTecnico.get(t.id) ?? 0
    return {
      id: t.id,
      full_name: t.full_name,
      weekly_hours: t.weekly_hours ?? 40,
      pratiche_attive,
      estimated_load: pratiche_attive * 8, // stima 8h/sett per pratica
    }
  }).sort((a, b) => b.estimated_load - a.estimated_load)

  // ─── Profittabilità per tipo ──────────────────────────────────────────────
  const { data: profitData } = await supabase
    .from('preventivi')
    .select('total_net, pratica_id, status, pratiche ( pratica_type_id, pratica_types ( label ) )')
    .eq('status', 'accettato')
    .gte('created_at', twelveMonthsAgo)

  const typeMap = new Map<string, { label: string; total: number; count: number }>()
  for (const prev of profitData ?? []) {
    const pratica = prev.pratiche as unknown as { pratica_type_id: string; pratica_types: { label: string }[] | { label: string } | null } | null
    if (!pratica) continue
    const praticaType = Array.isArray(pratica.pratica_types) ? pratica.pratica_types[0] : pratica.pratica_types
    const label = praticaType?.label ?? 'Sconosciuto'
    if (!typeMap.has(label)) typeMap.set(label, { label, total: 0, count: 0 })
    typeMap.get(label)!.total += prev.total_net
    typeMap.get(label)!.count++
  }

  const profitByType = Array.from(typeMap.values())
    .map(t => ({ ...t, avg: t.count > 0 ? t.total / t.count : 0 }))
    .sort((a, b) => b.avg - a.avg)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Analisi delle performance dello studio</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bottleneck */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Colli di bottiglia</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tempo medio per fase (ultime 50 pratiche completate)</p>
          </div>
          <BottleneckChart phases={bottleneckPhases} maxHours={maxHours} />
        </div>

        {/* Conversion rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Tasso di conversione</h2>
            <p className="text-xs text-gray-400 mt-0.5">Lead → Pratica negli ultimi 6 mesi</p>
          </div>
          <ConversionChart months={monthsData} />
        </div>

        {/* Capacity planning */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Capacity planning</h2>
            <p className="text-xs text-gray-400 mt-0.5">Carico stimato per tecnico (8h per pratica/sett)</p>
          </div>
          <CapacityTable tecnici={capacityData} />
        </div>

        {/* Profittabilità per tipo */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Profittabilità per tipo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Valore medio preventivi accettati per tipo (12 mesi)</p>
          </div>
          {profitByType.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">Nessun preventivo accettato</div>
          ) : (
            <div className="space-y-3">
              {profitByType.map(t => (
                <div key={t.label} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{t.label}</span>
                    <span className="text-gray-400 ml-2 text-xs">{t.count} pratiche</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-700">
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(t.avg)}
                    </div>
                    <div className="text-xs text-gray-400">media netta</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
