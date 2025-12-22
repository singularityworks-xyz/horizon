import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* Navigation */}
      <nav className="w-full border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter text-primary">HORIZON</div>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="z-10 max-w-4xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Horizon Admin Portal v1.0
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-foreground text-balance">
            Manage projects with <br />
            <span className="text-primary selection:bg-primary/20">calm intelligence.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            The central nervous system for your enterprise workflows. Orchestrate teams, assets, and
            timelines from a single source of truth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/signup"
              className="h-12 px-8 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Start Free Trial
            </Link>
            <Link
              href="/dashboard"
              className="h-12 px-8 rounded-lg bg-card text-foreground font-medium border border-border flex items-center hover:bg-secondary/50 transition-all"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="bg-white py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Workflow Orchestration',
                description:
                  'Design and deploy complex business processes with an intuitive visual editor.',
              },
              {
                title: 'Asset Management',
                description:
                  'Securely store, version, and distribute critical project assets across your organization.',
              },
              {
                title: 'Team Collaboration',
                description:
                  'Connect stakeholders with role-based access control and real-time updates.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-background border border-border hover:border-primary/20 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <div className="w-6 h-6 bg-primary rounded-sm opacity-80"></div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Horizon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
