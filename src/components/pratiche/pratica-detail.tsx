'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, User, MapPin,
  FileText, ExternalLink, AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { HandoffDialog } from './handoff-dialog'
import { triggerHandoff } from '@/lib/workflow/handoff'
import { formatDate, formatDateTime, formatCurrency, getClientDisplayName } from '@/utils/format'
import { getHoursInPhase, getSlaStatus } from '@/utils/sla'
import type {
  Pratica, PraticaPhase, Task, Preventivo, Payment,
  AuditLog, Profile, WorkflowTemplate,
} from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead', attiva: 'Attiva', sospesa: 'Sospesa',
  completata: 'Completata', annullata: 'Annullata',
}
const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  attiva: 'bg-blue-100 text-blue-700',
  sospesa: 'bg-yellow-100 text-yellow-700',
  completata: 'bg-green-100 text-green-700',
  annullata: 'bg-red-100 text-red-700',
}

type Tab = 'generale' | 'fasi' | 'documenti' | 'economico' | 'audit'

interface PraticaDetailProps {
  pratica: Pratica
  currentUser: Pick<Profile, 'id' | 'full_name' | 'role'>
  phases: PraticaPhase[]
  tasks: Task[]
  preventivi: Preventivo[]
  payments: Payment[]
  auditLog: AuditLog[]
}

export function PraticaDetail({
  pratica: initialPratica,
  currentUser,
  phases,
  tasks,
  preventivi,
  payments,
  auditLog,
}: PraticaDetailProps) {
  const router = useRouter()
  const [pratica, setPratica] = useState(initialPratica)
  const [tab, setTab] = useState<Tab>('generale')
  const [handoffOpen, setHandoffOpen] = useState(false)

  const clientName = pratica.clients ? getClientDisplayName(pratica.clients) : '—'

  // SLA corrente
  const currentPhase = phases.find(p => !p.ended_at)
  const hoursInPhase = currentPhase ? getHoursInPhase(currentPhase.started_at) : 0
  const slaHours = currentPhase?.sla_hours ?? 0
  const slaStatus = getSlaStatus(hoursInPhase, slaHours)

  // Handoff disponibile
  const canHandoff =
    pratica.status === 'attiva' &&
    (currentUser.role === 'titolare' ||
      currentUser.role === 'admin' ||
      pratica.current_responsible === currentUser.id)

  // Template fase corrente e successiva (semplificate: non le abbiamo qui, calcoliamo dal back)
  const nextTemplate = null as WorkflowTemplate | null // verrà dalla API response
  const isLastPhase = false // verrà dalla API response

  async function handleHandoff(notes: string) {
    const result = await triggerHandoff(pratica.id, notes)
    setPratica(result.pratica)
    if (result.isCompleted) {
      toast.success('Pratica completata!')
    } else {
      toast.success('Fase avanzata con successo')
    }
    router.refresh()
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'generale', label: 'Generale' },
    { key: 'fasi', label: `Fasi (${phases.length})` },
    { key: 'documenti', label: 'Documenti' },
    { key: 'economico', label: `Economico (${preventivi.length})` },
    ...(currentUser.role === 'titolare' || currentUser.role === 'admin'
      ? [{ key: 'audit' as Tab, label: 'Audit log' }]
      : []),
  ]

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Pratiche
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-lg font-bold text-blue-700">{pratica.practice_code}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pratica.status]}`}>
              {STATUS_LABELS[pratica.status]}
            </span>
            {slaStatus === 'breached' && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                SLA Sforato
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{clientName}</h1>
          {pratica.pratica_types && (
            <p className="text-sm text-gray-500 mt-0.5">{pratica.pratica_types.label}</p>
          )}
        </div>

        {canHandoff && (
          <Button onClick={() => setHandoffOpen(true)} className="shrink-0">
            <ArrowRight className="w-4 h-4 mr-2" />
            Avanza fase
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Generale */}
      {tab === 'generale' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info cliente */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Cliente</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>{clientName}</span>
              </div>
              {pratica.clients?.email && (
                <div className="text-gray-500">{pratica.clients.email}</div>
              )}
              {pratica.clients?.phone && (
                <div className="text-gray-500">{pratica.clients.phone}</div>
              )}
            </div>
          </div>

          {/* Info cantiere */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Cantiere</h3>
            <div className="space-y-2 text-sm">
              {pratica.site_address || pratica.site_city ? (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    {pratica.site_address && <div>{pratica.site_address}</div>}
                    {pratica.site_city && <div className="text-gray-500">{pratica.site_city}</div>}
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">Nessun indirizzo</span>
              )}
            </div>
          </div>

          {/* Stato workflow */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Stato workflow</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Fase corrente</span>
                <span className="font-medium">{pratica.current_phase_code ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Responsabile</span>
                <span className="font-medium">{pratica.profiles?.full_name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">SLA</span>
                <SlaIndicator hoursInPhase={hoursInPhase} slaHours={slaHours} slaStatus={slaStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Aperta il</span>
                <span>{formatDate(pratica.opened_at)}</span>
              </div>
              {pratica.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Completata il</span>
                  <span className="text-green-700 font-medium">{formatDate(pratica.completed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Drive */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Documenti Drive</h3>
            {pratica.drive_folder_url ? (
              <a
                href={pratica.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                Apri cartella Drive
              </a>
            ) : (
              <p className="text-sm text-gray-400">Cartella Drive non ancora creata</p>
            )}
          </div>

          {/* Note */}
          {pratica.notes && (
            <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Note</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{pratica.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Fasi */}
      {tab === 'fasi' && (
        <div className="space-y-3">
          {phases.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna fase registrata</p>
          ) : (
            phases.map((phase, idx) => {
              const isOpen = !phase.ended_at
              const duration = phase.duration_hours
                ? `${phase.duration_hours.toFixed(1)}h`
                : null
              return (
                <div
                  key={phase.id}
                  className={`flex items-start gap-4 p-4 bg-white border rounded-lg ${
                    isOpen ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isOpen ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isOpen ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{phase.phase_label}</span>
                      {isOpen && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          In corso
                        </span>
                      )}
                      {phase.sla_breached && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                          SLA sforato
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Responsabile: {phase.profiles?.full_name ?? '—'}</span>
                      <span>Iniziata: {formatDate(phase.started_at)}</span>
                      {phase.ended_at && <span>Terminata: {formatDate(phase.ended_at)}</span>}
                      {duration && <span>Durata: {duration}</span>}
                    </div>
                    {phase.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{phase.notes}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Documenti */}
      {tab === 'documenti' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          {pratica.drive_folder_url ? (
            <div className="space-y-3">
              <FileText className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-600">I documenti sono archiviati su Google Drive.</p>
              <a
                href={pratica.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                Apri cartella Drive
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <FileText className="w-10 h-10 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400">Cartella Drive non ancora disponibile.</p>
              <p className="text-xs text-gray-400">Verrà creata automaticamente al prossimo avanzamento di fase.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Economico */}
      {tab === 'economico' && (
        <div className="space-y-4">
          {preventivi.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-400">Nessun preventivo per questa pratica.</p>
            </div>
          ) : (
            preventivi.map(prev => (
              <div key={prev.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">
                    Preventivo v{prev.version_number}
                  </span>
                  <Badge variant={prev.status === 'accettato' ? 'default' : 'outline'}>
                    {prev.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Onorario</span>
                    <span>{formatCurrency(prev.honorarium)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Spese</span>
                    <span>{formatCurrency(prev.expenses)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">Totale lordo</span>
                    <span>{formatCurrency(prev.total_gross)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">Netto</span>
                    <span>{formatCurrency(prev.total_net)}</span>
                  </div>
                </div>
                {prev.valid_until && (
                  <p className="text-xs text-gray-400 mt-2">
                    Valido fino al {formatDate(prev.valid_until)}
                  </p>
                )}
              </div>
            ))
          )}

          {/* Pagamenti */}
          {payments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Piano pagamenti</h3>
              <div className="space-y-2">
                {payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{pay.step_label}</span>
                      {pay.due_date && (
                        <span className="text-gray-500 ml-2">— scadenza {formatDate(pay.due_date)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{formatCurrency(pay.amount)}</span>
                      <Badge
                        variant={
                          pay.status === 'ricevuto' ? 'default' :
                          pay.status === 'in_ritardo' ? 'destructive' : 'outline'
                        }
                      >
                        {pay.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Audit log (solo titolare/admin) */}
      {tab === 'audit' && (
        <div className="space-y-2">
          {auditLog.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun evento registrato.</p>
          ) : (
            auditLog.map(entry => (
              <div key={entry.id} className="flex gap-3 text-sm bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="text-xs text-gray-400 shrink-0 pt-0.5 w-32">
                  {formatDateTime(entry.created_at)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700 capitalize">{entry.action}</span>
                  {entry.new_data && typeof entry.new_data === 'object' && 'phase_code' in entry.new_data && (
                    <span className="text-gray-500 ml-1">
                      → fase {String(entry.new_data.phase_code ?? 'completata')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialog handoff */}
      <HandoffDialog
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        onConfirm={handleHandoff}
        currentPhaseLabel={pratica.current_phase_code ?? '—'}
        nextTemplate={nextTemplate}
        isLastPhase={isLastPhase}
      />
    </div>
  )
}
