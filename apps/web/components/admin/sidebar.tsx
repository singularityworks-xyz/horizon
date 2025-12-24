'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  GitBranch,
  ClipboardList,
  BarChart3,
  Settings,
  Circle,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/admin/dashboard/clients', icon: Users },
  { name: 'Projects', href: '/admin/dashboard/projects', icon: FolderKanban },
  { name: 'Workflows', href: '/admin/workflows', icon: GitBranch },
  { name: 'Questionnaire', href: '/admin/questionnaire', icon: ClipboardList },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-full bg-background border border-border rounded-2xl p-6 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const isActive =
            item.href === '/admin/dashboard'
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href as any}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }
              `}
            >
              <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3" />
              </div>
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
