import { ArrowLeft, Mail, Calendar, Building2 } from 'lucide-react';
import Link from 'next/link';

interface ClientHeaderProps {
  client: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  };
}

export function ClientHeader({ client }: ClientHeaderProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-4">
      {/* Back Navigation */}
      <Link
        href="/admin/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Client Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {client.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {client.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Joined {formatDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
            Edit
          </button>
          <button className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-colors">
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
