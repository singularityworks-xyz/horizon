'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user info from cookies/headers set by proxy
    const userEmail = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user-email='))
      ?.split('=')[1];

    const userRole = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user-role='))
      ?.split('=')[1];

    if (userEmail && userRole === 'ADMIN') {
      setUserInfo({ email: decodeURIComponent(userEmail), role: userRole });
    } else {
      // If not admin or no user info, redirect appropriately
      router.push('/auth/login');
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            Admin Control Plane
          </h1>
          <p className="text-muted-foreground">
            Manage projects, oversee client progress, and maintain system health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground">{userInfo.email}</p>
            <p className="text-xs text-muted-foreground">{userInfo.role}</p>
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
                Email: <span className="text-foreground font-medium">{userInfo.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Role: <span className="text-foreground font-medium">{userInfo.role}</span>
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
