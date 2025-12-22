export default function AdminClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Client Management</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Invite New Client
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
        <p>Client Management List - Coming Soon</p>
      </div>
    </div>
  );
}
