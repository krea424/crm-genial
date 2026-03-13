'use client'

import Link from 'next/link'
import { User, MapPin, AlertTriangle } from 'lucide-react'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { getClientDisplayName } from '@/utils/format'
import type { RadarItem } from '@/types/database'

interface RadarCardProps {
  item: RadarItem
}

export function RadarCard({ item }: RadarCardProps) {
  const clientName = item.clients ? getClientDisplayName(item.clients) : '—'
  const responsible = item.profiles?.full_name ?? '—'
  const location = [item.site_city, item.site_address].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/pratiche/${item.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      {/* Header: codice + SLA */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
          {item.practice_code}
        </span>
        <SlaIndicator
          startedAt={
            item.current_phase_code
              ? undefined
              : undefined
          }
          slaHours={item.sla_hours}
          hoursInPhase={item.hours_in_phase}
          slaStatus={item.sla_status}
          compact
        />
      </div>

      {/* Cliente */}
      <p className="text-sm font-medium text-gray-900 truncate mb-1">{clientName}</p>

      {/* Tipo pratica */}
      {item.pratica_types && (
        <p className="text-xs text-gray-500 mb-2">{item.pratica_types.label}</p>
      )}

      {/* Location */}
      {location && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Responsabile */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <User className="w-2.5 h-2.5 text-gray-500" />
        </div>
        <span className="truncate">{responsible}</span>
        {item.sla_status === 'breached' && (
          <AlertTriangle className="w-3 h-3 text-red-500 ml-auto shrink-0" />
        )}
      </div>
    </Link>
  )
}
