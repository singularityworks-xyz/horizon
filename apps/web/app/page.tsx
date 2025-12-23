import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* Navigation */}
      <nav className="w-full border-b border-border bg-card backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter text-foreground">HORIZON</div>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 max-w-4xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Horizon Admin Portal v1.0
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-foreground text-balance">
            Manage projects with <br />
            <span className="text-primary selection:bg-primary/20 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              calm intelligence.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            The central nervous system for your enterprise workflows. Orchestrate teams, assets, and
            timelines from a single source of truth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/signup"
              className="group h-12 px-8 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="h-12 px-8 rounded-lg bg-card text-foreground font-medium border border-border flex items-center hover:border-primary/30 hover:bg-card/80 transition-all"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-24 border-t border-border">
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
                className="p-8 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <div className="w-6 h-6 bg-primary rounded-sm opacity-80 group-hover:opacity-100 group-hover:bg-primary-foreground"></div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Horizon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
