// Tipi generati manualmente dal modello dati - verranno sovrascritti da `supabase gen types typescript`
// Aggiornare dopo ogni migrazione SQL con: npx supabase gen types typescript --project-id vawycdyeuacwaamsoxmn > src/types/database.ts

export type UserRole = 'amministrativa' | 'tecnico' | 'titolare' | 'admin'

export type PraticaStatus = 'lead' | 'attiva' | 'sospesa' | 'completata' | 'annullata'

export type PreventivoStatus = 'bozza' | 'inviato' | 'accettato' | 'rifiutato' | 'scaduto'

export type PaymentStatus = 'atteso' | 'ricevuto' | 'in_ritardo'

export type NotificationType =
  | 'handoff'
  | 'sla_warning'
  | 'sla_breach'
  | 'billing_ready'
  | 'lead_pending'
  | 'payment_overdue'
  | 'preventivo_accettato'

export type SlaStatus = 'ok' | 'warning' | 'breached' | 'none'

export type ClientType = 'privato' | 'azienda' | 'ente_pubblico'

// ─── Entità core ──────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  email: string
  weekly_hours: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  client_type: ClientType
  first_name: string | null
  last_name: string | null
  company_name: string | null
  tax_code: string | null
  vat_number: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  created_at: string
  updated_at: string
}

export interface PraticaType {
  id: string
  code: string
  label: string
  description: string | null
  is_active: boolean
}

export interface WorkflowTemplate {
  id: string
  pratica_type_id: string
  phase_order: number
  phase_code: string
  phase_label: string
  default_role: UserRole
  sla_hours: number
  required_docs: string[]
  is_final: boolean
}

export interface Pratica {
  id: string
  practice_code: string // formato YYYY-NNN
  pratica_type_id: string
  client_id: string
  status: PraticaStatus
  title: string
  site_address: string | null
  site_city: string | null
  current_phase_code: string | null
  current_responsible: string | null // profile.id
  drive_folder_id: string | null
  drive_folder_url: string | null
  opened_at: string
  completed_at: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // join fields
  clients?: Client
  profiles?: Profile
  pratica_types?: PraticaType
}

export interface PraticaPhase {
  id: string
  pratica_id: string
  phase_code: string
  phase_label: string
  responsible_id: string
  started_at: string
  ended_at: string | null
  duration_hours: number | null
  sla_hours: number
  sla_breached: boolean
  notes: string | null
  // join fields
  profiles?: Profile
}

export interface Task {
  id: string
  pratica_id: string
  phase_code: string
  title: string
  description: string | null
  assigned_to: string | null
  estimated_hours: number | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface Preventivo {
  id: string
  pratica_id: string
  version_number: number
  status: PreventivoStatus
  honorarium: number
  expenses: number
  vat_rate: number
  apply_withholding: boolean
  taxable_amount: number
  vat_amount: number
  withholding_tax: number
  total_gross: number
  total_net: number
  valid_until: string | null
  sent_at: string | null
  accepted_at: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export interface Payment {
  id: string
  pratica_id: string
  preventivo_id: string | null
  step_label: string // es. "Acconto 30%"
  amount: number
  due_date: string | null
  received_at: string | null
  status: PaymentStatus
  notes: string | null
}

export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  body: string
  action_url: string | null
  read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: string
  actor_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

// ─── DTO per operazioni ───────────────────────────────────────────────────────

export interface QuickIntakeInput {
  client_type: ClientType
  first_name?: string
  last_name?: string
  company_name?: string
  email?: string
  phone?: string
  pratica_type_id: string
  site_address?: string
  site_city?: string
  notes?: string
}

export interface HandoffInput {
  pratica_id: string
  notes?: string
}

export interface PreventivoCalculation {
  taxable_amount: number
  vat_amount: number
  withholding_tax: number
  total_gross: number
  total_net: number
  honorarium: number
  expenses: number
  vat_rate: number
}

// ─── Radar ────────────────────────────────────────────────────────────────────

export interface RadarItem extends Pratica {
  sla_status: SlaStatus
  hours_in_phase: number
  sla_hours: number
}

export interface RadarColumn {
  phase_code: string
  phase_label: string
  items: RadarItem[]
  sla_breaches_count: number
}
