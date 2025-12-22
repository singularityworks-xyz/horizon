import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { type Permission, ROLE_PERMISSIONS } from './permissions';

interface TenantContextData {
  user: any;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  role: 'admin' | 'client' | 'viewer';
  permissions: Permission[];
}

export function useTenantContext() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  const [data, setData] = useState<TenantContextData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);

  useEffect(() => {
    // Only fetch if we have a session
    if (session?.user && !data) {
      setIsContextLoading(true);
      fetch('/api/auth/tenant-context')
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to fetch tenant context');
          }
          return res.json();
        })
        .then((ctx) => {
          setData(ctx);
          setIsContextLoading(false);
        })
        .catch((err) => {
          console.error('Tenant context fetch error:', err);
          setError(err);
          setIsContextLoading(false);
        });
    }
  }, [session, data]);

  const isLoading = isSessionLoading || isContextLoading;

  return {
    tenant: data?.tenant,
    role: data?.role,
    user: session?.user,
    isLoading,
    error,
    isAuthenticated: !!session,

    // Helpers
    hasRole: (requiredRole: string) => data?.role === requiredRole,
    hasPermission: (permission: Permission) => {
      // Admin has all permissions regardless of what's in the list
      if (data?.role === 'admin') return true;

      const role = data?.role;
      if (!role) return false;

      const perms = ROLE_PERMISSIONS[role] || [];
      return perms.includes(permission);
    },
  };
}
