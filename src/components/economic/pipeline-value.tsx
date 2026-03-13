import { formatCurrency, formatDate } from '@/utils/format'
import type { Preventivo, Pratica } from '@/types/database'

interface PipelineItem {
  preventivo: Preventivo & { pratiche: Pick<Pratica, 'practice_code' | 'id'> }
}

interface PipelineValueProps {
  items: PipelineItem[]
}

export function PipelineValue({ items }: PipelineValueProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Nessun preventivo attivo in pipeline
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-medium text-gray-500 pb-2">Pratica</th>
            <th className="text-left font-medium text-gray-500 pb-2">Versione</th>
            <th className="text-right font-medium text-gray-500 pb-2">Importo netto</th>
            <th className="text-right font-medium text-gray-500 pb-2">Scadenza</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map(({ preventivo }) => (
            <tr key={preventivo.id} className="hover:bg-gray-50">
              <td className="py-2.5">
                <a
                  href={`/pratiche/${preventivo.pratiche.id}`}
                  className="font-mono text-blue-700 hover:underline text-xs"
                >
                  {preventivo.pratiche.practice_code}
                </a>
              </td>
              <td className="py-2.5 text-gray-500">v{preventivo.version_number}</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">
                {formatCurrency(preventivo.total_net)}
              </td>
              <td className="py-2.5 text-right text-gray-500">
                {preventivo.valid_until ? formatDate(preventivo.valid_until) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200">
            <td colSpan={2} className="pt-2.5 text-sm font-semibold text-gray-700">Totale pipeline</td>
            <td className="pt-2.5 text-right font-bold text-blue-700">
              {formatCurrency(items.reduce((s, { preventivo }) => s + preventivo.total_net, 0))}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
