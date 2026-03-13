interface MonthData {
  month: string   // "Gen 25", "Feb 25", ecc.
  leads: number
  converted: number
  rate: number
}

interface ConversionChartProps {
  months: MonthData[]
}

export function ConversionChart({ months }: ConversionChartProps) {
  const maxLeads = Math.max(...months.map(m => m.leads), 1)

  if (months.every(m => m.leads === 0)) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        Nessun dato di conversione disponibile
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-2 h-32 mb-2">
        {months.map(m => {
          const totalH = (m.leads / maxLeads) * 100
          const convertedH = m.leads > 0 ? (m.converted / m.leads) * totalH : 0

          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col justify-end h-24 gap-0.5">
                <div
                  className="w-full bg-blue-200 rounded-t-sm transition-all"
                  style={{ height: `${totalH}%` }}
                  title={`${m.leads} lead`}
                >
                  <div
                    className="w-full bg-blue-600 rounded-t-sm"
                    style={{ height: `${convertedH > 0 ? (convertedH / totalH) * 100 : 0}%` }}
                    title={`${m.converted} convertiti`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Label mesi */}
      <div className="flex gap-2">
        {months.map(m => (
          <div key={m.month} className="flex-1 text-center">
            <div className="text-[10px] text-gray-400">{m.month}</div>
            <div className="text-xs font-medium text-gray-600">{m.rate}%</div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <span>Lead totali</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-600" />
          <span>Convertiti in pratica</span>
        </div>
      </div>
    </div>
  )
}
