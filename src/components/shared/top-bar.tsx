'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { GlobalSearch } from '@/components/shared/global-search'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  amministrativa: 'Amministrativa',
  tecnico: 'Tecnico',
  titolare: 'Titolare',
  admin: 'Admin',
}

interface TopBarProps {
  user: Profile
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <GlobalSearch />

      <div className="flex items-center gap-3">
        <NotificationBell userId={user.id} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-sm">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium leading-none">{user.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABELS[user.role]}</p>
                </div>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/impostazioni')}>
              Profilo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
