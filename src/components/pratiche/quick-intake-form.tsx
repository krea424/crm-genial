'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PraticaType } from '@/types/database'

const schema = z.object({
  client_type: z.enum(['privato', 'azienda', 'ente_pubblico']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().optional(),
  pratica_type_id: z.string().min(1, 'Seleziona il tipo pratica'),
  site_address: z.string().optional(),
  site_city: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface QuickIntakeFormProps {
  praticaTypes: PraticaType[]
}

export function QuickIntakeForm({ praticaTypes }: QuickIntakeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { client_type: 'privato' },
  })

  const clientType = watch('client_type')

  async function onSubmit(values: FormValues) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessione scaduta'); setLoading(false); return }

    try {
      // Crea cliente
      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert({
          client_type: values.client_type,
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          company_name: values.company_name || null,
          email: values.email || null,
          phone: values.phone || null,
        })
        .select('id')
        .single()

      if (clientErr || !client) throw new Error(clientErr?.message ?? 'Errore creazione cliente')

      // Recupera primo template per tipo pratica
      const { data: templates } = await supabase
        .from('workflow_templates')
        .select('phase_code, phase_label, default_role, sla_hours')
        .eq('pratica_type_id', values.pratica_type_id)
        .order('phase_order', { ascending: true })
        .limit(1)

      const firstTemplate = templates?.[0]

      // Trova responsabile default (primo utente con il ruolo della fase 1)
      let defaultResponsible: string | null = null
      if (firstTemplate?.default_role) {
        const { data: responsibles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', firstTemplate.default_role)
          .limit(1)
        defaultResponsible = responsibles?.[0]?.id ?? null
      }

      // Crea pratica (il trigger SQL genererà practice_code)
      const { data: pratica, error: praticaErr } = await supabase
        .from('pratiche')
        .insert({
          pratica_type_id: values.pratica_type_id,
          client_id: client.id,
          status: 'lead',
          title: '',
          site_address: values.site_address || null,
          site_city: values.site_city || null,
          current_phase_code: firstTemplate?.phase_code ?? null,
          current_responsible: defaultResponsible,
          opened_at: new Date().toISOString(),
          notes: values.notes || null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (praticaErr || !pratica) throw new Error(praticaErr?.message ?? 'Errore creazione pratica')

      // Apri prima fase
      if (firstTemplate && defaultResponsible) {
        await supabase.from('pratica_phases').insert({
          pratica_id: pratica.id,
          phase_code: firstTemplate.phase_code,
          phase_label: firstTemplate.phase_label,
          responsible_id: defaultResponsible,
          started_at: new Date().toISOString(),
          sla_hours: firstTemplate.sla_hours,
          sla_breached: false,
        })
      }

      // Provision cartella Drive in background (fire & forget)
      supabase.functions.invoke('provision-drive-folder', {
        body: { pratica_id: pratica.id },
      }).catch(() => {/* non blocca il flusso */})

      toast.success('Pratica creata con successo')
      router.push(`/pratiche/${pratica.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Tipo cliente */}
      <div>
        <Label>Tipo cliente</Label>
        <div className="flex gap-3 mt-2">
          {(['privato', 'azienda', 'ente_pubblico'] as const).map(type => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={type} {...register('client_type')} className="accent-blue-600" />
              <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dati cliente */}
      <div className="grid grid-cols-2 gap-4">
        {clientType === 'privato' ? (
          <>
            <div>
              <Label htmlFor="last_name">Cognome</Label>
              <Input id="last_name" {...register('last_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" {...register('first_name')} className="mt-1" />
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <Label htmlFor="company_name">Ragione sociale</Label>
            <Input id="company_name" {...register('company_name')} className="mt-1" />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} className="mt-1" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" {...register('phone')} className="mt-1" />
        </div>
      </div>

      {/* Tipo pratica */}
      <div>
        <Label htmlFor="pratica_type_id">Tipo pratica *</Label>
        <select
          id="pratica_type_id"
          {...register('pratica_type_id')}
          className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Seleziona —</option>
          {praticaTypes.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {errors.pratica_type_id && (
          <p className="text-xs text-red-500 mt-1">{errors.pratica_type_id.message}</p>
        )}
      </div>

      {/* Cantiere */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="site_address">Indirizzo cantiere</Label>
          <Input id="site_address" {...register('site_address')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="site_city">Città</Label>
          <Input id="site_city" {...register('site_city')} className="mt-1" />
        </div>
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="notes">Note iniziali</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creazione in corso…' : 'Crea pratica'}
      </Button>
    </form>
  )
}
