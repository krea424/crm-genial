import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PraticheList } from '@/components/pratiche/pratiche-list'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ q?: string; status?: string; cursor?: string }>
}

export default async function PratichePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q, status, cursor } = await searchParams

  let query = supabase
    .from('pratiche')
    .select(`
      *,
      clients ( id, client_type, first_name, last_name, company_name ),
      pratica_types ( id, code, label ),
      profiles!pratiche_current_responsible_fkey ( id, full_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (q) {
    query = query.or(
      `practice_code.ilike.%${q}%,site_city.ilike.%${q}%,site_address.ilike.%${q}%`
    )
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, count } = await query

  const items = data ?? []
  const hasNextPage = items.length > PAGE_SIZE
  const pratiche = hasNextPage ? items.slice(0, PAGE_SIZE) : items

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pratiche</h1>
          <p className="text-gray-500 mt-1">{count ?? 0} pratiche totali</p>
        </div>
        <a
          href="/pratiche/nuova"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          + Nuova pratica
        </a>
      </div>
      <PraticheList
        pratiche={pratiche}
        hasNextPage={hasNextPage}
        cursor={cursor ?? null}
        total={count ?? 0}
      />
    </div>
  )
}
