import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuickIntakeForm } from '@/components/pratiche/quick-intake-form'

export default async function NuovaPraticaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Solo amministrativa e titolare/admin possono creare pratiche
  if (!profile || !['amministrativa', 'titolare', 'admin'].includes(profile.role)) {
    redirect('/pratiche')
  }

  const { data: praticaTypes } = await supabase
    .from('pratica_types')
    .select('*')
    .eq('is_active', true)
    .order('label')

  return (
    <div>
      <Link
        href="/pratiche"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Pratiche
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuova pratica</h1>
        <p className="text-gray-500 mt-1">Inserisci i dati del cliente e seleziona il tipo di pratica</p>
      </div>

      <QuickIntakeForm praticaTypes={praticaTypes ?? []} />
    </div>
  )
}
