'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, FileText, User, X } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/use-global-search'

export function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { query, setQuery, results, loading, open, setOpen, clear } = useGlobalSearch()

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        clear()
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [clear])

  function navigate(href: string) {
    clear()
    router.push(href)
  }

  return (
    <div className="relative w-64">
      {/* Input */}
      <div className="relative flex items-center">
        {loading
          ? <Loader2 className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 animate-spin" />
          : <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Cerca pratiche, clienti… ⌘K"
          className="w-full pl-8 pr-7 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder:text-gray-400"
        />
        {query && (
          <button onClick={clear} className="absolute right-2">
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown risultati */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map(r => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => navigate(r.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                r.type === 'pratica' ? 'bg-blue-50' : 'bg-purple-50'
              }`}>
                {r.type === 'pratica'
                  ? <FileText className="w-3.5 h-3.5 text-blue-600" />
                  : <User className="w-3.5 h-3.5 text-purple-600" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
              </div>
              {r.practice_code && (
                <span className="ml-auto text-xs font-mono text-blue-600 shrink-0">
                  {r.practice_code}
                </span>
              )}
            </button>
          ))}
          <div className="px-3 py-1.5 border-t border-gray-100 text-xs text-gray-400 text-center">
            {results.length} risultati — premi Esc per chiudere
          </div>
        </div>
      )}

      {/* No results */}
      {open && results.length === 0 && !loading && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-3 py-3 text-sm text-gray-400 text-center">
          Nessun risultato per &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
