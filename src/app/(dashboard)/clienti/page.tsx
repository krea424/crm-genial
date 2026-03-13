import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Building2, Search } from 'lucide-react'
import { formatDate } from '@/utils/format'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ClientiPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q } = await searchParams

  let query = supabase
    .from('clients')
    .select('*, pratiche ( id, practice_code, status )', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,tax_code.ilike.%${q}%`
    )
  }

  const { data: clienti, count } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="text-gray-500 mt-1">{count ?? 0} clienti</p>
        </div>
      </div>

      {/* Ricerca */}
      <form className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Cerca per nome, email, codice fiscale..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Lista */}
      <div className="space-y-2">
        {(clienti ?? []).length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            {q ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
          </div>
        ) : (
          (clienti ?? []).map(c => {
            const name = c.client_type === 'privato'
              ? `${c.last_name ?? ''} ${c.first_name ?? ''}`.trim() || '—'
              : c.company_name ?? '—'
            const pratiche = c.pratiche as { id: string; practice_code: string; status: string }[]
            const attive = pratiche.filter(p => p.status === 'attiva').length

            return (
              <Link
                key={c.id}
                href={`/clienti/${c.id}`}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  {c.client_type === 'privato'
                    ? <Users className="w-5 h-5 text-gray-500" />
                    : <Building2 className="w-5 h-5 text-gray-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{name}</p>
                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.city && <span>{c.city}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium text-gray-700">{pratiche.length} pratiche</div>
                  {attive > 0 && (
                    <div className="text-xs text-blue-600">{attive} attive</div>
                  )}
                  <div className="text-xs text-gray-400">{formatDate(c.created_at)}</div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
