import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'
import { KpiCards } from '@/components/economic/kpi-cards'
import { PipelineValue } from '@/components/economic/pipeline-value'

export const revalidate = 300 // 5 minuti

export default async function DashboardPage() {
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
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const yearAgo = subMonths(now, 12).toISOString()

  // Carica tutti i dati in parallelo
  const [
    pipelineRes,
    preventiviYearRes,
    pagamentiMeseRes,
    pagamentiRitardoRes,
    praticheAttiveRes,
    slaBreachRes,
  ] = await Promise.all([
    // Pipeline: preventivi inviati non scaduti
    supabase
      .from('preventivi')
      .select('*, pratiche ( id, practice_code )')
      .eq('status', 'inviato')
      .or(`valid_until.is.null,valid_until.gte.${now.toISOString().split('T')[0]}`),

    // Preventivi ultimi 12 mesi per tasso accettazione
    supabase
      .from('preventivi')
      .select('status')
      .gte('created_at', yearAgo)
      .in('status', ['accettato', 'rifiutato', 'scaduto', 'inviato']),

    // Pagamenti ricevuti questo mese
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'ricevuto')
      .gte('received_at', monthStart)
      .lte('received_at', monthEnd),

    // Pagamenti in ritardo
    supabase
      .from('payments')
      .select('id')
      .eq('status', 'in_ritardo'),

    // Pratiche attive
    supabase
      .from('pratiche')
      .select('id, practice_code, status, current_phase_code, clients ( first_name, last_name, company_name, client_type ), pratica_types ( label )')
      .eq('status', 'attiva')
      .order('opened_at', { ascending: false })
      .limit(10),

    // SLA breach attivi
    supabase
      .from('pratica_phases')
      .select('id, pratica_id, phase_label, pratiche ( practice_code )')
      .eq('sla_breached', true)
      .is('ended_at', null)
      .limit(10),
  ])

  // KPI calcolati
  const pipeline = (pipelineRes.data ?? []).reduce((s, p) => s + p.total_net, 0)

  const preventiviYear = preventiviYearRes.data ?? []
  const accettati = preventiviYear.filter(p => p.status === 'accettato').length
  const totaleConclusi = preventiviYear.filter(p => ['accettato', 'rifiutato', 'scaduto'].includes(p.status)).length
  const accettazioneRate = totaleConclusi > 0 ? (accettati / totaleConclusi) * 100 : 0

  const fatturatoMese = (pagamentiMeseRes.data ?? []).reduce((s, p) => s + p.amount, 0)
  const pagamentiInRitardo = pagamentiRitardoRes.data?.length ?? 0

  const pipelineItems = (pipelineRes.data ?? []).map(p => ({ preventivo: p as Parameters<typeof PipelineValue>[0]['items'][0]['preventivo'] }))
  const praticheAttive = praticheAttiveRes.data ?? []
  const slaBreaches = slaBreachRes.data ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Panoramica economica e stato pratiche</p>
      </div>

      {/* KPI */}
      <KpiCards
        pipeline={pipeline}
        accettazioneRate={accettazioneRate}
        fatturatoMese={fatturatoMese}
        pagamentiInRitardo={pagamentiInRitardo}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline preventivi */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline attiva</h2>
          <PipelineValue items={pipelineItems} />
        </div>

        {/* SLA Breaches */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            SLA sforati
            {slaBreaches.length > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                {slaBreaches.length}
              </span>
            )}
          </h2>
          {slaBreaches.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nessun SLA sforato</p>
          ) : (
            <div className="space-y-2">
              {(slaBreaches as { id: string; pratica_id: string; phase_label: string; pratiche: { practice_code: string }[] | null }[]).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <a href={`/pratiche/${b.pratica_id}`} className="font-mono text-blue-700 text-xs hover:underline">
                      {Array.isArray(b.pratiche) ? b.pratiche[0]?.practice_code : (b.pratiche as { practice_code: string } | null)?.practice_code}
                    </a>
                    <span className="text-gray-600 ml-2">{b.phase_label}</span>
                  </div>
                  <span className="text-xs text-red-600 font-medium">⚠ SLA sforato</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pratiche attive recenti */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Pratiche attive recenti</h2>
            <a href="/pratiche" className="text-xs text-blue-600 hover:underline">Vedi tutte →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2">Codice</th>
                  <th className="text-left font-medium text-gray-500 pb-2">Cliente</th>
                  <th className="text-left font-medium text-gray-500 pb-2">Tipo</th>
                  <th className="text-left font-medium text-gray-500 pb-2">Fase corrente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(praticheAttive as {
                  id: string
                  practice_code: string
                  current_phase_code: string | null
                  clients: { first_name: string | null; last_name: string | null; company_name: string | null; client_type: string }[] | null
                  pratica_types: { label: string }[] | null
                }[]).map((p) => {
                  const client = Array.isArray(p.clients) ? p.clients[0] : p.clients
                  const clientName = client
                    ? client.client_type === 'privato'
                      ? `${client.last_name ?? ''} ${client.first_name ?? ''}`.trim()
                      : client.company_name ?? '—'
                    : '—'
                  const praticaType = Array.isArray(p.pratica_types) ? p.pratica_types[0] : p.pratica_types
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5">
                        <a href={`/pratiche/${p.id}`} className="font-mono text-blue-700 text-xs hover:underline">
                          {p.practice_code}
                        </a>
                      </td>
                      <td className="py-2.5 text-gray-700">{clientName}</td>
                      <td className="py-2.5 text-gray-500">{praticaType?.label ?? '—'}</td>
                      <td className="py-2.5 text-gray-500">{p.current_phase_code ?? '—'}</td>
                    </tr>
                  )
                })}
                {praticheAttive.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                      Nessuna pratica attiva
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
