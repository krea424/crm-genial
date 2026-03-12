'use client'

import { useState } from 'react'
import { PraticaRow } from '@/components/pratiche/pratica-row'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import type { Pratica } from '@/types/database'

interface PraticheListProps {
  pratiche: Pratica[]
}

export function PraticheList({ pratiche }: PraticheListProps) {
  const [search, setSearch] = useState('')

  const filtered = pratiche.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    const clientName = p.clients
      ? `${p.clients.first_name ?? ''} ${p.clients.last_name ?? ''} ${p.clients.company_name ?? ''}`.toLowerCase()
      : ''
    return (
      p.practice_code.toLowerCase().includes(q) ||
      clientName.includes(q) ||
      (p.site_city ?? '').toLowerCase().includes(q) ||
      (p.title ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      {/* Barra di ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cerca per codice, cliente, città..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search ? 'Nessuna pratica trovata' : 'Nessuna pratica ancora creata'}
        </div>
      ) : (
        filtered.map((pratica) => (
          <PraticaRow key={pratica.id} pratica={pratica} />
        ))
      )}
    </div>
  )
}
