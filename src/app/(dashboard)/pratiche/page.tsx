import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PraticheList } from '@/components/pratiche/pratiche-list'

export default async function PratichePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pratiche } = await supabase
    .from('pratiche')
    .select(`
      *,
      clients ( id, client_type, first_name, last_name, company_name ),
      pratica_types ( id, code, label ),
      profiles!pratiche_current_responsible_fkey ( id, full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pratiche</h1>
          <p className="text-gray-500 mt-1">{pratiche?.length ?? 0} pratiche totali</p>
        </div>
        <a
          href="/pratiche/nuova"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          + Nuova pratica
        </a>
      </div>
      <PraticheList pratiche={pratiche ?? []} />
    </div>
  )
}
