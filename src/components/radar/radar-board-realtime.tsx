'use client'

import { useState } from 'react'
import { useRadarRealtime } from '@/hooks/use-radar-realtime'
import { RadarBoard } from './radar-board'
import type { RadarColumn, WorkflowTemplate, Profile, PraticaType } from '@/types/database'

interface RadarBoardRealtimeProps {
  initialColumns: RadarColumn[]
  templates: WorkflowTemplate[]
  profiles: Pick<Profile, 'id' | 'full_name'>[]
  praticaTypes: PraticaType[]
}

export function RadarBoardRealtime({
  initialColumns,
  templates,
  profiles,
  praticaTypes,
}: RadarBoardRealtimeProps) {
  const { columns } = useRadarRealtime({ initialColumns, templates })
  const [filterResponsible, setFilterResponsible] = useState('')
  const [filterType, setFilterType] = useState('')

  const totalPratiche = columns.reduce((sum, col) => sum + col.items.length, 0)
  const totalBreaches = columns.reduce((sum, col) => sum + col.sla_breaches_count, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Filtri + stats */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <select
            value={filterResponsible}
            onChange={e => setFilterResponsible(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i responsabili</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i tipi</option>
            {praticaTypes.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {(filterResponsible || filterType) && (
            <button
              onClick={() => { setFilterResponsible(''); setFilterType('') }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Rimuovi filtri
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span><span className="font-semibold text-gray-900">{totalPratiche}</span> pratiche attive</span>
          {totalBreaches > 0 && (
            <span className="text-red-600 font-medium">
              ⚠ {totalBreaches} SLA sforat{totalBreaches === 1 ? 'o' : 'i'}
            </span>
          )}
        </div>
      </div>

      <RadarBoard
        columns={columns}
        filterResponsible={filterResponsible || undefined}
        filterType={filterType || undefined}
      />
    </div>
  )
}
