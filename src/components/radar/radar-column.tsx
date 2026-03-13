'use client'

import { AlertTriangle } from 'lucide-react'
import { RadarCard } from './radar-card'
import type { RadarColumn as RadarColumnType } from '@/types/database'

interface RadarColumnProps {
  column: RadarColumnType
}

export function RadarColumn({ column }: RadarColumnProps) {
  const hasBreaches = column.sla_breaches_count > 0

  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px] w-[260px] shrink-0">
      {/* Header colonna */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 leading-tight">
            {column.phase_label}
          </h3>
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-medium">
            {column.items.length}
          </span>
        </div>
        {hasBreaches && (
          <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{column.sla_breaches_count}</span>
          </div>
        )}
      </div>

      {/* Divider colorato in base a breach */}
      <div
        className={`h-0.5 rounded-full mb-3 ${
          hasBreaches ? 'bg-red-400' : 'bg-gray-200'
        }`}
      />

      {/* Cards */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {column.items.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nessuna pratica
          </div>
        ) : (
          column.items.map(item => <RadarCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
