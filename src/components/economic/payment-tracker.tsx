'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import type { Payment } from '@/types/database'

const STATUS_CONFIG = {
  atteso: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50', label: 'In attesa' },
  ricevuto: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Ricevuto' },
  in_ritardo: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'In ritardo' },
}

interface PaymentTrackerProps {
  payments: Payment[]
  praticaId: string
  canEdit: boolean
}

export function PaymentTracker({ payments: initialPayments, praticaId, canEdit }: PaymentTrackerProps) {
  const [payments, setPayments] = useState(initialPayments)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const totalExpected = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalReceived = payments
    .filter(p => p.status === 'ricevuto')
    .reduce((sum, p) => sum + p.amount, 0)

  async function markReceived(paymentId: string) {
    setLoadingId(paymentId)
    const supabase = createClient()

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'ricevuto',
        received_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (error) {
      toast.error('Errore aggiornamento pagamento')
    } else {
      setPayments(prev =>
        prev.map(p =>
          p.id === paymentId
            ? { ...p, status: 'ricevuto', received_at: new Date().toISOString() }
            : p
        )
      )
      toast.success('Pagamento registrato')

      // Verifica se tutti i pagamenti sono ricevuti → notifica billing_ready
      const allReceived = payments.every(p => p.id === paymentId || p.status === 'ricevuto')
      if (allReceived) {
        // Notifica titolari che il saldo è completato
        await supabase.functions.invoke('trigger-handoff', {
          body: { pratica_id: praticaId, action: 'payment_complete' },
        }).catch(() => {/* non blocca */})
      }
    }

    setLoadingId(null)
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        Nessun piano di pagamento configurato.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra progresso */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-500">Incassato</span>
        <span className="font-semibold">
          {formatCurrency(totalReceived)}{' '}
          <span className="text-gray-400 font-normal">/ {formatCurrency(totalExpected)}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: totalExpected > 0 ? `${(totalReceived / totalExpected) * 100}%` : '0%' }}
        />
      </div>

      {/* Lista step */}
      <div className="space-y-2 mt-4">
        {payments.map(payment => {
          const cfg = STATUS_CONFIG[payment.status]
          const Icon = cfg.icon

          return (
            <div
              key={payment.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg} ${
                payment.status === 'in_ritardo' ? 'border-red-200' : 'border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{payment.step_label}</span>
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="font-semibold text-gray-700">{formatCurrency(payment.amount)}</span>
                  {payment.due_date && <span>Scadenza: {formatDate(payment.due_date)}</span>}
                  {payment.received_at && <span>Ricevuto: {formatDate(payment.received_at)}</span>}
                </div>
              </div>

              {canEdit && payment.status !== 'ricevuto' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markReceived(payment.id)}
                  disabled={loadingId === payment.id}
                  className="shrink-0 text-xs"
                >
                  {loadingId === payment.id ? '…' : 'Segna ricevuto'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
