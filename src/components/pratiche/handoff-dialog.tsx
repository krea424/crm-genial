'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { WorkflowTemplate } from '@/types/database'

interface HandoffDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (notes: string) => Promise<void>
  currentPhaseLabel: string
  nextTemplate: WorkflowTemplate | null
  isLastPhase: boolean
}

export function HandoffDialog({
  open,
  onClose,
  onConfirm,
  currentPhaseLabel,
  nextTemplate,
  isLastPhase,
}: HandoffDialogProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm(notes)
      setNotes('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il passaggio di fase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLastPhase ? 'Completa pratica' : 'Passaggio di fase'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Riepilogo transizione */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
            <span className="font-medium text-gray-700">{currentPhaseLabel}</span>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
            {isLastPhase ? (
              <span className="font-medium text-green-700">Completata ✓</span>
            ) : (
              <span className="font-medium text-blue-700">{nextTemplate?.phase_label}</span>
            )}
          </div>

          {/* Info prossimo responsabile */}
          {!isLastPhase && nextTemplate && (
            <p className="text-sm text-gray-600">
              Il sistema assegnerà la fase al ruolo{' '}
              <span className="font-medium">{nextTemplate.default_role}</span>.
            </p>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note di passaggio (opzionale)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Es. Documenti caricati in Drive, contattare il cliente prima di procedere…"
              rows={3}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Annulla
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isLastPhase ? 'Completa pratica' : 'Conferma passaggio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
