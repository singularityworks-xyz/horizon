export default function AdminProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects Management</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Create New Project
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
        <p>Admin Projects List - Coming Soon</p>
      </div>
    </div>
  );
}
