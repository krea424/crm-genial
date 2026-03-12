import { cn } from '@/lib/utils'
import { formatDuration, SLA_COLORS } from '@/utils/sla'
import type { SlaStatus } from '@/types/database'

interface SlaIndicatorProps {
  hoursInPhase: number
  slaHours: number
  status: SlaStatus
  className?: string
}

export function SlaIndicator({ hoursInPhase, slaHours, status, className }: SlaIndicatorProps) {
  if (status === 'none' || hoursInPhase === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        SLA_COLORS[status],
        className
      )}
    >
      {status === 'breached' && <span>⚠</span>}
      {formatDuration(hoursInPhase)}
      {slaHours > 0 && <span className="opacity-60">/{formatDuration(slaHours)}</span>}
    </span>
  )
}
