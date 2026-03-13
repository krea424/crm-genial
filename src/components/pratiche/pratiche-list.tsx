'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PraticaRow } from '@/components/pratiche/pratica-row'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pratica, PraticaStatus } from '@/types/database'

const STATUS_OPTIONS: { value: PraticaStatus | ''; label: string }[] = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'lead', label: 'Lead' },
  { value: 'attiva', label: 'Attive' },
  { value: 'sospesa', label: 'Sospese' },
  { value: 'completata', label: 'Completate' },
  { value: 'annullata', label: 'Annullate' },
]

interface PraticheListProps {
  pratiche: Pratica[]
  hasNextPage: boolean
  cursor: string | null
  total: number
}

export function PraticheList({ pratiche, hasNextPage, cursor, total }: PraticheListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [status, setStatus] = useState<PraticaStatus | ''>(
    (searchParams.get('status') as PraticaStatus) ?? ''
  )

  function applyFilters(newSearch?: string, newStatus?: string, newCursor?: string | null) {
    const params = new URLSearchParams()
    if (newSearch ?? search) params.set('q', newSearch ?? search)
    if (newStatus ?? status) params.set('status', newStatus ?? status)
    if (newCursor) params.set('cursor', newCursor)
    startTransition(() => {
      router.push(`/pratiche?${params.toString()}`)
    })
  }

  function handleSearch(value: string) {
    setSearch(value)
    applyFilters(value, status, null)
  }

  function handleStatus(value: string) {
    setStatus(value as PraticaStatus | '')
    applyFilters(search, value, null)
  }

  const currentPage = searchParams.get('cursor') ? '…' : '1'

  return (
    <div className="space-y-3">
      {/* Filtri */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cerca per codice, cliente, città..."
            className="pl-9"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={e => handleStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {(search || status) && (
          <button
            onClick={() => { setSearch(''); setStatus(''); applyFilters('', '', null) }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Rimuovi filtri
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">{total} pratiche</span>
      </div>

      {/* Intestazione */}
      <div className="hidden md:grid grid-cols-[120px_1fr_140px_140px_100px_120px] gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
        <span>Codice</span>
        <span>Cliente / Titolo</span>
        <span>Fase</span>
        <span>Responsabile</span>
        <span>Stato</span>
        <span>SLA</span>
      </div>

      {/* Righe */}
      <div className={isPending ? 'opacity-60 pointer-events-none' : ''}>
        {pratiche.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {search || status ? 'Nessuna pratica trovata per i filtri selezionati' : 'Nessuna pratica ancora creata'}
          </div>
        ) : (
          pratiche.map(p => <PraticaRow key={p.id} pratica={p} />)
        )}
      </div>

      {/* Paginazione */}
      {(cursor || hasNextPage) && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={!cursor || isPending}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Precedente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyFilters(search, status, pratiche[pratiche.length - 1]?.created_at)}
            disabled={!hasNextPage || isPending}
          >
            Successiva
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
