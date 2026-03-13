import { formatCurrency } from '@/utils/format'
import { TrendingUp, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface KpiCardsProps {
  pipeline: number           // valore preventivi inviati non scaduti
  accettazioneRate: number   // % accettazione ultimi 12 mesi (0-100)
  fatturatoMese: number      // incassato mese corrente
  pagamentiInRitardo: number // numero pagamenti in ritardo
}

export function KpiCards({ pipeline, accettazioneRate, fatturatoMese, pagamentiInRitardo }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label="Pipeline attiva"
        value={formatCurrency(pipeline)}
        icon={TrendingUp}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
        sublabel="Preventivi inviati"
      />
      <KpiCard
        label="Tasso accettazione"
        value={`${accettazioneRate.toFixed(0)}%`}
        icon={CheckCircle}
        iconColor="text-green-600"
        iconBg="bg-green-50"
        sublabel="Ultimi 12 mesi"
        highlight={accettazioneRate >= 60}
      />
      <KpiCard
        label="Incassato questo mese"
        value={formatCurrency(fatturatoMese)}
        icon={FileText}
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
        sublabel="Pagamenti ricevuti"
      />
      <KpiCard
        label="Pagamenti in ritardo"
        value={String(pagamentiInRitardo)}
        icon={AlertCircle}
        iconColor={pagamentiInRitardo > 0 ? 'text-red-600' : 'text-gray-400'}
        iconBg={pagamentiInRitardo > 0 ? 'bg-red-50' : 'bg-gray-50'}
        sublabel="Da sollecitare"
        alert={pagamentiInRitardo > 0}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  sublabel,
  highlight,
  alert,
}: {
  label: string
  value: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  sublabel: string
  highlight?: boolean
  alert?: boolean
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 ${alert ? 'border-red-200' : 'border-gray-200'}`}>
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className={`text-2xl font-bold mb-0.5 ${highlight ? 'text-green-700' : alert ? 'text-red-700' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>
    </div>
  )
}
