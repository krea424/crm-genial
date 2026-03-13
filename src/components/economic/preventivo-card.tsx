'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Send, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PaymentTracker } from './payment-tracker'
import type { Preventivo, Payment, Profile } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  scaduto: 'Scaduto',
}
const STATUS_VARIANTS: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  bozza: 'outline',
  inviato: 'secondary',
  accettato: 'default',
  rifiutato: 'destructive',
  scaduto: 'destructive',
}

interface PreventivoCardProps {
  preventivo: Preventivo
  payments: Payment[]
  currentUser: Pick<Profile, 'id' | 'role'>
  praticaId: string
}

export function PreventivoCard({ preventivo: initial, payments, currentUser, praticaId }: PreventivoCardProps) {
  const [preventivo, setPreventivo] = useState(initial)
  const [expanded, setExpanded] = useState(preventivo.status === 'bozza')
  const [loading, setLoading] = useState<string | null>(null)

  const canManage = ['titolare', 'admin', 'amministrativa'].includes(currentUser.role)

  async function transition(status: string) {
    setLoading(status)
    const supabase = createClient()

    const updates: Record<string, unknown> = { status }
    if (status === 'inviato') updates.sent_at = new Date().toISOString()
    if (status === 'accettato') updates.accepted_at = new Date().toISOString()

    const { error } = await supabase
      .from('preventivi')
      .update(updates)
      .eq('id', preventivo.id)

    if (error) {
      toast.error('Errore aggiornamento preventivo')
    } else {
      setPreventivo(prev => ({ ...prev, status, ...updates } as Preventivo))

      if (status === 'accettato') {
        // Notifica avvio workflow
        void supabase.from('notifications').insert({
          recipient_id: currentUser.id,
          type: 'preventivo_accettato',
          title: `Preventivo v${preventivo.version_number} accettato`,
          body: `Il cliente ha accettato il preventivo. Puoi avviare i lavori.`,
          action_url: `/pratiche/${praticaId}`,
          read: false,
        })
        toast.success('Preventivo accettato — workflow avviato')
      } else {
        toast.success(`Preventivo ${STATUS_LABELS[status].toLowerCase()}`)
      }
    }

    setLoading(null)
  }

  const filteredPayments = payments.filter(p => p.preventivo_id === preventivo.id)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">
            Preventivo v{preventivo.version_number}
          </span>
          <Badge variant={STATUS_VARIANTS[preventivo.status]}>
            {STATUS_LABELS[preventivo.status]}
          </Badge>
          <span className="text-sm font-bold text-blue-700">
            {formatCurrency(preventivo.total_net)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {preventivo.valid_until && (
            <span className="text-xs text-gray-400">
              Valido fino al {formatDate(preventivo.valid_until)}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Body espanso */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5">
          {/* Calcoli fiscali */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <Row label="Onorario" value={formatCurrency(preventivo.honorarium)} />
            <Row label="Spese" value={formatCurrency(preventivo.expenses)} />
            <Row label="IVA 22%" value={formatCurrency(preventivo.vat_amount)} />
            {preventivo.withholding_tax > 0 && (
              <Row label="Ritenuta acconto" value={`− ${formatCurrency(preventivo.withholding_tax)}`} className="text-red-600" />
            )}
            <div className="col-span-2 flex justify-between font-bold text-gray-900 border-t pt-2">
              <span>Totale lordo</span><span>{formatCurrency(preventivo.total_gross)}</span>
            </div>
            <div className="col-span-2 flex justify-between font-bold text-blue-700 text-base">
              <span>Netto a pagare</span><span>{formatCurrency(preventivo.total_net)}</span>
            </div>
          </div>

          {preventivo.notes && (
            <p className="text-sm text-gray-500 italic">{preventivo.notes}</p>
          )}

          {/* Azioni workflow */}
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              {preventivo.status === 'bozza' && (
                <Button
                  size="sm"
                  onClick={() => transition('inviato')}
                  disabled={loading === 'inviato'}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {loading === 'inviato' ? '…' : 'Segna come inviato'}
                </Button>
              )}
              {preventivo.status === 'inviato' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => transition('accettato')}
                    disabled={!!loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    {loading === 'accettato' ? '…' : 'Accettato'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => transition('rifiutato')}
                    disabled={!!loading}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    {loading === 'rifiutato' ? '…' : 'Rifiutato'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Piano pagamenti */}
          {filteredPayments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Piano pagamenti</h4>
              <PaymentTracker
                payments={filteredPayments}
                praticaId={praticaId}
                canEdit={canManage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className={className}>{value}</span>
    </div>
  )
}
