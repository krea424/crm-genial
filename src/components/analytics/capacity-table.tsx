interface TecnicoCapacity {
  id: string
  full_name: string
  weekly_hours: number
  pratiche_attive: number
  estimated_load: number  // ore stimate settimanali (pratiche_attive * 8)
}

interface CapacityTableProps {
  tecnici: TecnicoCapacity[]
}

export function CapacityTable({ tecnici }: CapacityTableProps) {
  if (tecnici.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        Nessun tecnico trovato
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-medium text-gray-500 pb-2">Tecnico</th>
            <th className="text-right font-medium text-gray-500 pb-2">Pratiche attive</th>
            <th className="text-right font-medium text-gray-500 pb-2">Carico stimato</th>
            <th className="text-right font-medium text-gray-500 pb-2">Disponibilità</th>
            <th className="text-left font-medium text-gray-500 pb-2 pl-4">Utilizzo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tecnici.map(t => {
            const utilization = t.weekly_hours > 0
              ? Math.min((t.estimated_load / t.weekly_hours) * 100, 120)
              : 0
            const remaining = Math.max(t.weekly_hours - t.estimated_load, 0)
            const isOverloaded = utilization > 90

            return (
              <tr key={t.id} className={isOverloaded ? 'bg-red-50/50' : ''}>
                <td className="py-2.5 font-medium text-gray-900">
                  {t.full_name}
                  {isOverloaded && (
                    <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      Overload
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right text-gray-600">{t.pratiche_attive}</td>
                <td className="py-2.5 text-right text-gray-600">{t.estimated_load}h/sett</td>
                <td className="py-2.5 text-right text-gray-600">{remaining}h/sett</td>
                <td className="py-2.5 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-24">
                      <div
                        className={`h-full rounded-full ${
                          utilization > 90 ? 'bg-red-500' :
                          utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      isOverloaded ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {Math.round(utilization)}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
