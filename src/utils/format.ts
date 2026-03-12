import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * Formatta una data ISO 8601 nel formato italiano dd/mm/yyyy
 */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: it })
}

/**
 * Formatta una data ISO 8601 nel formato italiano dd/mm/yyyy HH:mm
 */
export function formatDateTime(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy HH:mm', { locale: it })
}

/**
 * Formatta un importo in euro con separatori italiani
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Restituisce il nome completo di un cliente (privato o azienda)
 */
export function getClientDisplayName(client: {
  client_type: string
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
}): string {
  if (client.client_type === 'privato') {
    return [client.last_name, client.first_name].filter(Boolean).join(' ') || 'Cliente senza nome'
  }
  return client.company_name || 'Azienda senza nome'
}
