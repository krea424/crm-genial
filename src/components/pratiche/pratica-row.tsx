'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { getClientDisplayName } from '@/utils/format'
import { getHoursInPhase, getSlaStatus } from '@/utils/sla'
import type { Pratica } from '@/types/database'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  lead: 'outline',
  attiva: 'default',
  sospesa: 'secondary',
  completata: 'secondary',
  annullata: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  attiva: 'Attiva',
  sospesa: 'Sospesa',
  completata: 'Completata',
  annullata: 'Annullata',
}

interface PraticaRowProps {
  pratica: Pratica
}

export function PraticaRow({ pratica }: PraticaRowProps) {
  const clientName = pratica.clients ? getClientDisplayName(pratica.clients) : '—'
  const responsabile = pratica.profiles?.full_name ?? '—'

  // SLA disponibile solo per pratiche attive con fase corrente
  const hoursInPhase = pratica.current_phase_code && pratica.updated_at
    ? getHoursInPhase(pratica.updated_at)
    : 0

  return (
    <Link href={`/pratiche/${pratica.id}`}>
      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_140px_140px_100px_120px] gap-4 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer items-center">
        {/* Codice pratica */}
        <span className="font-mono text-sm font-semibold text-blue-700">
          {pratica.practice_code}
        </span>

        {/* Cliente / Titolo */}
        <div className="min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{clientName}</p>
          {pratica.site_city && (
            <p className="text-xs text-gray-500 truncate">{pratica.site_city}</p>
          )}
        </div>

        {/* Fase corrente */}
        <span className="text-sm text-gray-600 truncate">
          {pratica.current_phase_code ?? '—'}
        </span>

        {/* Responsabile */}
        <span className="text-sm text-gray-600 truncate">{responsabile}</span>

        {/* Status badge */}
        <Badge variant={STATUS_VARIANTS[pratica.status] ?? 'outline'}>
          {STATUS_LABELS[pratica.status] ?? pratica.status}
        </Badge>

        {/* SLA indicator */}
        <SlaIndicator
          hoursInPhase={hoursInPhase}
          slaHours={0} // sarà popolato con dati reali dalla query
          status={pratica.status === 'attiva' && hoursInPhase > 0 ? getSlaStatus(hoursInPhase, 48) : 'none'}
        />
      </div>
    </Link>
  )
}
