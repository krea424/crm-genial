import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PraticaDetail } from '@/components/pratiche/pratica-detail'

interface Props {
  params: { id: string }
}

export default async function PraticaDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [praticaRes, profileRes] = await Promise.all([
    supabase
      .from('pratiche')
      .select(`
        *,
        clients (*),
        profiles!pratiche_current_responsible_fkey ( id, full_name, role ),
        pratica_types (*)
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('id', user.id)
      .single(),
  ])

  if (praticaRes.error || !praticaRes.data) notFound()
  if (!profileRes.data) redirect('/login')

  const [phasesRes, tasksRes, preventiviRes, paymentsRes, auditRes] = await Promise.all([
    supabase
      .from('pratica_phases')
      .select('*, profiles!pratica_phases_responsible_id_fkey ( id, full_name )')
      .eq('pratica_id', params.id)
      .order('started_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('*')
      .eq('pratica_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('preventivi')
      .select('*')
      .eq('pratica_id', params.id)
      .order('version_number', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('pratica_id', params.id)
      .order('due_date', { ascending: true }),
    supabase
      .from('audit_log')
      .select('*')
      .eq('entity_id', params.id)
      .eq('entity_type', 'pratica')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <PraticaDetail
      pratica={praticaRes.data}
      currentUser={profileRes.data}
      phases={phasesRes.data ?? []}
      tasks={tasksRes.data ?? []}
      preventivi={preventiviRes.data ?? []}
      payments={paymentsRes.data ?? []}
      auditLog={auditRes.data ?? []}
    />
  )
}
