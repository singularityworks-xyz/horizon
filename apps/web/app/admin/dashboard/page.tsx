'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { LogoutButton } from '@/components/auth/logout-button';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login' as any);
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
              Control Plane
            </h1>
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-sm tracking-tight opacity-70">
            Manage projects, oversee client progress, and maintain system health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter opacity-50">
              {(user as any).role}
            </p>
          </div>
          <LogoutButton className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Projects</h3>
          <p className="text-3xl font-bold text-primary">-</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Clients</h3>
          <p className="text-3xl font-bold text-green-600">-</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Completed Tasks</h3>
          <p className="text-3xl font-bold text-amber-600">-</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'View Projects',
              desc: 'Manage active projects',
              icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
            },
            {
              title: 'Manage Clients',
              desc: 'Add and edit clients',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            },
            {
              title: 'Review Workflows',
              desc: 'Approve AI-generated workflows',
              icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              title: 'System Settings',
              desc: 'Configure system preferences',
              icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
            },
          ].map((action, i) => (
            <button
              key={i}
              className="p-4 border border-border bg-card rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-left flex flex-col gap-2 group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={action.icon}
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{action.title}</h4>
                <p className="text-sm text-muted-foreground">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Context Info */}
      <div className="mt-8 bg-card p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4">Session Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              User Details
            </h4>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Email: <span className="text-foreground font-medium">{user.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Role: <span className="text-foreground font-medium">{(user as any).role}</span>
              </p>
            </div>
          </div>
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              System Access
            </h4>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Access Level: <span className="text-foreground font-medium">Full Admin</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Permissions:{' '}
                <span className="text-foreground font-medium">Manage Tenants, Users, System</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
