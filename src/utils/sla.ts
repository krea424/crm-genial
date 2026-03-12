import type { SlaStatus } from '@/types/database'

/**
 * Calcola le ore trascorse dall'inizio di una fase.
 * Usa ore totali (non lavorative) per semplicità MVP.
 * TODO: Sprint 2 - implementare calcolo ore lavorative con festività italiane.
 */
export function getHoursInPhase(startedAt: string): number {
  const start = new Date(startedAt)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1))
}

/**
 * Determina lo stato SLA in base alle ore trascorse vs ore disponibili.
 * Warning: >= 80% del tempo SLA
 * Breached: >= 100% del tempo SLA
 */
export function getSlaStatus(hoursInPhase: number, slaHours: number): SlaStatus {
  if (slaHours <= 0) return 'none'
  const ratio = hoursInPhase / slaHours
  if (ratio >= 1) return 'breached'
  if (ratio >= 0.8) return 'warning'
  return 'ok'
}

/**
 * Formatta la durata in ore in formato leggibile: "5h", "2g 5h", "3g"
 */
export function formatDuration(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  if (remainingHours === 0) return `${days}g`
  return `${days}g ${remainingHours}h`
}

/**
 * Mappa SlaStatus a classi Tailwind CSS per colore
 */
export const SLA_COLORS: Record<SlaStatus, string> = {
  ok: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  breached: 'text-red-600 bg-red-50',
  none: 'text-gray-400 bg-gray-50',
}
