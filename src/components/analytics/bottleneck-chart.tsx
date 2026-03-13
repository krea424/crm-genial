interface PhaseStats {
  phase_label: string
  avg_hours: number
  count: number
  breach_rate: number
}

interface BottleneckChartProps {
  phases: PhaseStats[]
  maxHours: number
}

export function BottleneckChart({ phases, maxHours }: BottleneckChartProps) {
  if (phases.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        Dati insufficienti (servono almeno 5 pratiche completate)
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {phases.map(phase => {
        const widthPct = maxHours > 0 ? (phase.avg_hours / maxHours) * 100 : 0
        const isBottleneck = phase.avg_hours === maxHours
        const breachPct = Math.round(phase.breach_rate * 100)

        return (
          <div key={phase.phase_label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className={`font-medium ${isBottleneck ? 'text-red-700' : 'text-gray-700'}`}>
                {phase.phase_label}
                {isBottleneck && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                    Collo di bottiglia
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{phase.count} pratiche</span>
                {breachPct > 0 && (
                  <span className="text-red-500">{breachPct}% SLA sforati</span>
                )}
                <span className="font-semibold text-gray-700">
                  {phase.avg_hours < 24
                    ? `${Math.round(phase.avg_hours)}h`
                    : `${(phase.avg_hours / 24).toFixed(1)}g`}
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isBottleneck ? 'bg-red-500' :
                  breachPct > 30 ? 'bg-orange-400' : 'bg-blue-500'
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
