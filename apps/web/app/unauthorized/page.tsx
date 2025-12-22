import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">403</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">
          Access Denied
        </h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          You do not have permission to access the requested resource.
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          If you believe this is an error, please contact your administrator.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
