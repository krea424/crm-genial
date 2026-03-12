import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RadarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Radar</h1>
        <p className="text-gray-500 mt-1">Panoramica di tutte le pratiche attive per fase</p>
      </div>
      {/* RadarBoard component — implementato in Sprint 2 */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-sm">Il Radar Board sarà disponibile nel Sprint 2.</p>
        <p className="text-sm mt-1">Nel frattempo, usa la <a href="/pratiche" className="text-blue-600 underline">lista pratiche</a>.</p>
      </div>
    </div>
  )
}
