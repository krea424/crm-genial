'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SearchResult {
  id: string
  type: 'pratica' | 'cliente'
  title: string
  subtitle: string
  href: string
  practice_code?: string
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const q = `%${trimmed}%`

      const [praticheRes, clientiRes] = await Promise.all([
        supabase
          .from('pratiche')
          .select('id, practice_code, status, clients ( first_name, last_name, company_name, client_type ), pratica_types ( label )')
          .or(`practice_code.ilike.${q},site_address.ilike.${q},site_city.ilike.${q},notes.ilike.${q}`)
          .limit(5),
        supabase
          .from('clients')
          .select('id, client_type, first_name, last_name, company_name, email, phone')
          .or(`first_name.ilike.${q},last_name.ilike.${q},company_name.ilike.${q},email.ilike.${q},tax_code.ilike.${q}`)
          .limit(3),
      ])

      const praticheResults: SearchResult[] = (praticheRes.data ?? []).map(p => {
        const clients = p.clients as { first_name: string | null; last_name: string | null; company_name: string | null; client_type: string }[] | null
        const client = Array.isArray(clients) ? clients[0] : clients
        const clientName = client
          ? client.client_type === 'privato'
            ? `${client.last_name ?? ''} ${client.first_name ?? ''}`.trim()
            : client.company_name ?? '—'
          : '—'
        const types = p.pratica_types as { label: string }[] | null
        const typeLabel = Array.isArray(types) ? types[0]?.label : (types as { label: string } | null)?.label

        return {
          id: p.id,
          type: 'pratica',
          title: `${p.practice_code} — ${clientName}`,
          subtitle: typeLabel ?? p.status,
          href: `/pratiche/${p.id}`,
          practice_code: p.practice_code,
        }
      })

      const clientiResults: SearchResult[] = (clientiRes.data ?? []).map(c => {
        const name = c.client_type === 'privato'
          ? `${c.last_name ?? ''} ${c.first_name ?? ''}`.trim()
          : c.company_name ?? '—'
        return {
          id: c.id,
          type: 'cliente',
          title: name,
          subtitle: c.email ?? c.phone ?? c.client_type,
          href: `/clienti/${c.id}`,
        }
      })

      setResults([...praticheResults, ...clientiResults])
      setOpen(true)
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return { query, setQuery, results, loading, open, setOpen, clear }
}
