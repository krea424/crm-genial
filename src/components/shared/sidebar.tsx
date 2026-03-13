'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  RadioTower,
  FolderOpen,
  Users,
  Settings,
  Building2,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/radar',
    label: 'Radar',
    icon: RadioTower,
    roles: ['amministrativa', 'tecnico', 'titolare', 'admin'],
  },
  {
    href: '/pratiche',
    label: 'Pratiche',
    icon: FolderOpen,
    roles: ['amministrativa', 'tecnico', 'titolare', 'admin'],
  },
  {
    href: '/clienti',
    label: 'Clienti',
    icon: Users,
    roles: ['amministrativa', 'titolare', 'admin'],
  },
  {
    href: '/dashboard',
    label: 'Dashboard BI',
    icon: LayoutDashboard,
    roles: ['titolare', 'admin'],
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ['titolare', 'admin'],
  },
  {
    href: '/impostazioni',
    label: 'Impostazioni',
    icon: Settings,
    roles: ['titolare', 'admin'],
  },
]

interface SidebarProps {
  role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200">
        <Building2 className="w-5 h-5 text-blue-600 mr-2" />
        <span className="font-semibold text-gray-900 text-sm">Engineering OS</span>
      </div>

      {/* Navigazione */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
