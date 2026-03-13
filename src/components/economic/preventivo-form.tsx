'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { calculatePreventivo, generatePaymentPlan } from '@/utils/preventivo'
import { formatCurrency, formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  honorarium: z.number({ error: 'Inserisci l\'onorario' }).positive('Deve essere > 0'),
  expenses: z.number().min(0),
  apply_withholding: z.boolean(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  payment_template: z.enum(['standard', 'split_thirds']),
  generate_payment_plan: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface PreventivoFormProps {
  praticaId: string
  nextVersion: number
  onSuccess?: () => void
}

export function PreventivoForm({ praticaId, nextVersion, onSuccess }: PreventivoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(calculatePreventivo(0, 0))

  const { register, watch, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      honorarium: 0,
      expenses: 0,
      apply_withholding: true,
      payment_template: 'standard',
      generate_payment_plan: true,
    },
  })

  const watchHonorarium = watch('honorarium')
  const watchExpenses = watch('expenses')
  const watchWithholding = watch('apply_withholding')
  const watchTemplate = watch('payment_template')
  const watchGenPlan = watch('generate_payment_plan')

  useEffect(() => {
    const h = Number(watchHonorarium) || 0
    const e = Number(watchExpenses) || 0
    setPreview(calculatePreventivo(h, e, 0.22, watchWithholding))
  }, [watchHonorarium, watchExpenses, watchWithholding])

  const paymentSteps = watchGenPlan ? generatePaymentPlan(preview.total_net, watchTemplate) : []

  async function onSubmit(values: FormValues) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessione scaduta'); setLoading(false); return }

    const calc = calculatePreventivo(
      values.honorarium,
      values.expenses,
      0.22,
      values.apply_withholding
    )

    try {
      // Crea preventivo
      const { data: preventivo, error: prevErr } = await supabase
        .from('preventivi')
        .insert({
          pratica_id: praticaId,
          version_number: nextVersion,
          status: 'bozza',
          honorarium: calc.honorarium,
          expenses: calc.expenses,
          vat_rate: calc.vat_rate,
          apply_withholding: values.apply_withholding,
          taxable_amount: calc.taxable_amount,
          vat_amount: calc.vat_amount,
          withholding_tax: calc.withholding_tax,
          total_gross: calc.total_gross,
          total_net: calc.total_net,
          valid_until: values.valid_until || null,
          notes: values.notes || null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (prevErr || !preventivo) throw new Error(prevErr?.message ?? 'Errore creazione preventivo')

      // Crea piano pagamenti se richiesto
      if (values.generate_payment_plan && paymentSteps.length > 0) {
        await supabase.from('payments').insert(
          paymentSteps.map(step => ({
            pratica_id: praticaId,
            preventivo_id: preventivo.id,
            step_label: step.step_label,
            amount: step.amount,
            status: 'atteso',
          }))
        )
      }

      toast.success(`Preventivo v${nextVersion} creato`)
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="honorarium">Onorario (€) *</Label>
          <Input
            id="honorarium"
            type="number"
            step="0.01"
            min="0"
            {...register('honorarium', { valueAsNumber: true })}
            className="mt-1"
          />
          {errors.honorarium && (
            <p className="text-xs text-red-500 mt-1">{errors.honorarium.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="expenses">Spese (€)</Label>
          <Input
            id="expenses"
            type="number"
            step="0.01"
            min="0"
            {...register('expenses', { valueAsNumber: true })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="apply_withholding"
          type="checkbox"
          {...register('apply_withholding')}
          className="accent-blue-600"
        />
        <Label htmlFor="apply_withholding" className="cursor-pointer">
          Applica ritenuta d&apos;acconto (20% su 20% = 4% effettivo)
        </Label>
      </div>

      {/* Preview calcoli */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Riepilogo preventivo v{nextVersion}</h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Onorario</span>
            <span>{formatCurrency(preview.honorarium)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Spese</span>
            <span>{formatCurrency(preview.expenses)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Imponibile</span>
            <span>{formatCurrency(preview.taxable_amount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>IVA 22%</span>
            <span>{formatCurrency(preview.vat_amount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 border-t pt-1.5">
            <span>Totale lordo</span>
            <span>{formatCurrency(preview.total_gross)}</span>
          </div>
          {preview.withholding_tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Ritenuta acconto</span>
              <span className="text-red-600">− {formatCurrency(preview.withholding_tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-blue-700 col-span-2 border-t pt-1.5 text-base">
            <span>Netto a pagare</span>
            <span>{formatCurrency(preview.total_net)}</span>
          </div>
        </div>
      </div>

      {/* Piano pagamenti */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            id="generate_payment_plan"
            type="checkbox"
            {...register('generate_payment_plan')}
            className="accent-blue-600"
          />
          <Label htmlFor="generate_payment_plan" className="cursor-pointer">
            Genera piano di pagamento
          </Label>
        </div>

        {watchGenPlan && (
          <div className="pl-6 space-y-3">
            <div className="flex gap-4">
              {(['standard', 'split_thirds'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    value={t}
                    {...register('payment_template')}
                    className="accent-blue-600"
                  />
                  {t === 'standard' ? '30% + 70%' : '33% + 33% + 34%'}
                </label>
              ))}
            </div>
            <div className="space-y-1">
              {paymentSteps.map((step, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600 bg-white border border-gray-100 rounded px-3 py-1.5">
                  <span>{step.step_label}</span>
                  <span className="font-medium">{formatCurrency(step.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Validità */}
      <div>
        <Label htmlFor="valid_until">Valido fino al</Label>
        <Input id="valid_until" type="date" {...register('valid_until')} className="mt-1 max-w-xs" />
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="notes">Note</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={2}
          className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <Button type="submit" disabled={loading || preview.honorarium === 0}>
        {loading ? 'Salvataggio…' : `Salva preventivo v${nextVersion}`}
      </Button>
    </form>
  )
}
