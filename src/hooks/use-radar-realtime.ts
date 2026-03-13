'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getHoursInPhase, getSlaStatus } from '@/utils/sla'
import type { RadarColumn, RadarItem, WorkflowTemplate } from '@/types/database'

interface UseRadarRealtimeOptions {
  initialColumns: RadarColumn[]
  templates: WorkflowTemplate[]
}

export function useRadarRealtime({ initialColumns, templates }: UseRadarRealtimeOptions) {
  const [columns, setColumns] = useState<RadarColumn[]>(initialColumns)

  const rebuildColumns = useCallback(async () => {
    const supabase = createClient()

    const { data: pratiche } = await supabase
      .from('pratiche')
      .select(`
        *,
        clients ( id, client_type, first_name, last_name, company_name ),
        profiles!pratiche_current_responsible_fkey ( id, full_name ),
        pratica_types ( id, code, label )
      `)
      .eq('status', 'attiva')
      .not('current_phase_code', 'is', null)

    if (!pratiche) return

    // Raggruppa per fase usando i template per ordine e label
    const phaseMap = new Map<string, { label: string; order: number; items: RadarItem[] }>()

    // Inizializza colonne da template (per tipo)
    const templatesByPhase = new Map<string, WorkflowTemplate>()
    for (const t of templates) {
      if (!templatesByPhase.has(t.phase_code)) {
        templatesByPhase.set(t.phase_code, t)
      }
    }

    for (const p of pratiche) {
      const phaseCode = p.current_phase_code!
      const template = templatesByPhase.get(phaseCode)
      const slaHours = template?.sla_hours ?? 0

      // Cerca la fase corrente nelle pratica_phases per sapere quando è iniziata
      const { data: currentPhase } = await supabase
        .from('pratica_phases')
        .select('started_at')
        .eq('pratica_id', p.id)
        .eq('phase_code', phaseCode)
        .is('ended_at', null)
        .single()

      const startedAt = currentPhase?.started_at ?? p.updated_at
      const hoursInPhase = getHoursInPhase(startedAt)
      const slaStatus = getSlaStatus(hoursInPhase, slaHours)

      const radarItem: RadarItem = {
        ...p,
        sla_status: slaStatus,
        hours_in_phase: hoursInPhase,
        sla_hours: slaHours,
      }

      if (!phaseMap.has(phaseCode)) {
        phaseMap.set(phaseCode, {
          label: template?.phase_label ?? phaseCode,
          order: template?.phase_order ?? 999,
          items: [],
        })
      }
      phaseMap.get(phaseCode)!.items.push(radarItem)
    }

    // Ordina colonne per phase_order
    const newColumns: RadarColumn[] = Array.from(phaseMap.entries())
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([phase_code, { label, items }]) => ({
        phase_code,
        phase_label: label,
        items,
        sla_breaches_count: items.filter(i => i.sla_status === 'breached').length,
      }))

    setColumns(newColumns)
  }, [templates])

  useEffect(() => {
    const supabase = createClient()

    // Sottoscrizione real-time su pratiche con status='attiva'
    const channel = supabase
      .channel('radar-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pratiche',
          filter: "status=eq.attiva",
        },
        () => {
          rebuildColumns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rebuildColumns])

  return { columns }
}
