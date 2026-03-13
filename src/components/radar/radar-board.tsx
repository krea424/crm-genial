'use client'

import { RadarColumn } from './radar-column'
import type { RadarColumn as RadarColumnType, RadarItem } from '@/types/database'

interface RadarBoardProps {
  columns: RadarColumnType[]
  filterResponsible?: string
  filterType?: string
}

export function RadarBoard({ columns, filterResponsible, filterType }: RadarBoardProps) {
  // Applica filtri client-side
  const filtered = columns.map(col => {
    const items = col.items.filter(item => {
      if (filterResponsible && item.current_responsible !== filterResponsible) return false
      if (filterType && item.pratica_type_id !== filterType) return false
      return true
    })
    return {
      ...col,
      items,
      sla_breaches_count: items.filter((i: RadarItem) => i.sla_status === 'breached').length,
    }
  })

  // Mostra solo colonne con pratica o tutte (quando non filtro attivo)
  const visibleColumns = filterResponsible || filterType
    ? filtered.filter(col => col.items.length > 0)
    : filtered

  if (visibleColumns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-sm">Nessuna pratica attiva corrisponde ai filtri</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
      {visibleColumns.map(col => (
        <RadarColumn key={col.phase_code} column={col} />
      ))}
    </div>
  )
}
