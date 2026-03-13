import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Building2, Mail, Phone, MapPin } from 'lucide-react'
import { formatDate } from '@/utils/format'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead', attiva: 'Attiva', sospesa: 'Sospesa',
  completata: 'Completata', annullata: 'Annullata',
}
const STATUS_VARIANTS: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  lead: 'outline', attiva: 'default', sospesa: 'secondary',
  completata: 'secondary', annullata: 'destructive',
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [clienteRes, praticheRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('pratiche')
      .select('id, practice_code, status, current_phase_code, opened_at, completed_at, pratica_types ( label )')
      .eq('client_id', id)
      .order('opened_at', { ascending: false }),
  ])

  if (clienteRes.error || !clienteRes.data) notFound()

  const c = clienteRes.data
  const name = c.client_type === 'privato'
    ? `${c.last_name ?? ''} ${c.first_name ?? ''}`.trim() || '—'
    : c.company_name ?? '—'

  const pratiche = praticheRes.data ?? []

  return (
    <div className="max-w-3xl">
      <Link
        href="/clienti"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Clienti
      </Link>

      {/* Header cliente */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          {c.client_type === 'privato'
            ? <Users className="w-7 h-7 text-gray-400" />
            : <Building2 className="w-7 h-7 text-gray-400" />
          }
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500 capitalize">{c.client_type.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Info contatto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Contatti</h3>
          {c.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <a href={`mailto:${c.email}`} className="hover:text-blue-600">{c.email}</a>
            </div>
          )}
          {c.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <a href={`tel:${c.phone}`} className="hover:text-blue-600">{c.phone}</a>
            </div>
          )}
          {(c.address || c.city) && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span>{[c.address, c.city].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {!c.email && !c.phone && !c.address && (
            <p className="text-sm text-gray-400">Nessun contatto registrato</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dati fiscali</h3>
          {c.tax_code && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Codice fiscale</span>
              <span className="font-mono">{c.tax_code}</span>
            </div>
          )}
          {c.vat_number && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Partita IVA</span>
              <span className="font-mono">{c.vat_number}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cliente dal</span>
            <span>{formatDate(c.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Storico pratiche */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Pratiche ({pratiche.length})
          </h2>
          <Link
            href={`/pratiche/nuova`}
            className="text-xs text-blue-600 hover:underline"
          >
            + Nuova pratica
          </Link>
        </div>

        {pratiche.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400">
            Nessuna pratica associata
          </div>
        ) : (
          <div className="space-y-2">
            {pratiche.map(p => {
              const praticaType = Array.isArray(p.pratica_types)
                ? p.pratica_types[0]
                : p.pratica_types as { label: string } | null

              return (
                <Link
                  key={p.id}
                  href={`/pratiche/${p.id}`}
                  className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <span className="font-mono text-sm font-semibold text-blue-700 w-20 shrink-0">
                    {p.practice_code}
                  </span>
                  <span className="text-sm text-gray-600 flex-1">{praticaType?.label ?? '—'}</span>
                  <span className="text-xs text-gray-400">
                    {p.current_phase_code ?? 'Completata'}
                  </span>
                  <Badge variant={STATUS_VARIANTS[p.status] ?? 'outline'}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDate(p.opened_at)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
