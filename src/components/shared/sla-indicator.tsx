import { cn } from '@/lib/utils'
import { getHoursInPhase, getSlaStatus, formatDuration, SLA_COLORS } from '@/utils/sla'
import type { SlaStatus } from '@/types/database'

interface SlaIndicatorProps {
  // Può ricevere i valori già calcolati (Radar) oppure solo startedAt (lista pratiche)
  hoursInPhase?: number
  slaHours: number
  slaStatus?: SlaStatus
  startedAt?: string
  compact?: boolean
  className?: string
}

export function SlaIndicator({
  hoursInPhase: hoursInPhaseProp,
  slaHours,
  slaStatus: slaStatusProp,
  startedAt,
  compact = false,
  className,
}: SlaIndicatorProps) {
  const hoursInPhase = hoursInPhaseProp ?? (startedAt ? getHoursInPhase(startedAt) : 0)
  const status = slaStatusProp ?? getSlaStatus(hoursInPhase, slaHours)

  if (status === 'none' || hoursInPhase === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
        SLA_COLORS[status],
        className
      )}
    >
      {status === 'breached' && <span>⚠</span>}
      {formatDuration(hoursInPhase)}
      {!compact && slaHours > 0 && (
        <span className="opacity-60">/{formatDuration(slaHours)}</span>
      )}
    </span>
  )
}
