'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { StatCard } from '@/components/admin/stat-card';
import { DollarSign, Users, FolderKanban, TrendingUp, Activity } from 'lucide-react';

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value="$0" icon={DollarSign} iconColor="text-green-400" />
        <StatCard title="Total Clients" value="0" icon={Users} iconColor="text-blue-400" />
        <StatCard
          title="Total Projects"
          value="0"
          icon={FolderKanban}
          iconColor="text-purple-400"
        />
      </div>

      {/* Chart Placeholders - Matching Layout Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 - Revenue Trends */}
        <div className="bg-card border border-border rounded-2xl p-6 h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Revenue Trends</h3>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        {/* Chart 2 - Project Status */}
        <div className="bg-card border border-border rounded-2xl p-6 h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Project Status</h3>
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chart visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'New client registered', time: '2 hours ago', type: 'success' },
            { action: 'Project milestone completed', time: '5 hours ago', type: 'info' },
            { action: 'Workflow approved', time: '1 day ago', type: 'success' },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                }`}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.action}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
