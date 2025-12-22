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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Horizon Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{userInfo.email}</span>
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                {userInfo.role}
              </span>
              <LogoutButton className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to the Admin Control Plane
          </h2>
          <p className="text-lg text-gray-600">
            Manage projects, oversee client progress, and maintain project execution excellence.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Projects</h3>
            <p className="text-3xl font-bold text-blue-600">-</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Clients</h3>
            <p className="text-3xl font-bold text-green-600">-</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed Tasks</h3>
            <p className="text-3xl font-bold text-purple-600">-</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900">View Projects</h4>
              <p className="text-sm text-gray-500">Manage active projects</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900">Manage Clients</h4>
              <p className="text-sm text-gray-500">Add and edit clients</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900">Review Workflows</h4>
              <p className="text-sm text-gray-500">Approve AI-generated workflows</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <h4 className="font-medium text-gray-900">System Settings</h4>
              <p className="text-sm text-gray-500">Configure system preferences</p>
            </button>
          </div>
        </div>

        {/* User Context Info */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Session Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">User Details</h4>
              <p className="text-sm text-gray-600">Email: {userInfo.email}</p>
              <p className="text-sm text-gray-600">Role: {userInfo.role}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">System Access</h4>
              <p className="text-sm text-gray-600">Access Level: Full Admin</p>
              <p className="text-sm text-gray-600">Can manage all tenants and users</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
