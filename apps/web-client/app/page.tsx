import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter">HORIZON</div>
          <div className="flex items-center gap-8 text-sm font-medium">
            <Link href="/login" className="hover:text-gray-500 transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight mb-8">
              The future of <br />
              <span className="text-gray-400">project execution.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 max-w-xl mb-12 leading-relaxed">
              Horizon is your unified platform for project intake, real-time tracking, and seamless
              delivery. Built for speed, designed for clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 bg-black text-white text-center rounded-lg font-semibold hover:bg-gray-800 transition-all transform hover:scale-[1.02]"
              >
                Start your project
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border border-gray-200 text-black text-center rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                View demo
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Grid / Intro */}
        <section className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto border-t border-gray-100 pt-20">
          <div>
            <div className="w-12 h-12 bg-black rounded-lg mb-6 flex items-center justify-center">
              <div className="w-6 h-[2px] bg-white"></div>
            </div>
            <h3 className="text-xl font-bold mb-4">Intelligent Intake</h3>
            <p className="text-gray-500 leading-relaxed">
              Automated workflows to capture requirements and jumpstart your projects without the
              friction.
            </p>
          </div>
          <div>
            <div className="w-12 h-12 bg-black rounded-lg mb-6 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white rounded-full"></div>
            </div>
            <h3 className="text-xl font-bold mb-4">Real-time Visibility</h3>
            <p className="text-gray-500 leading-relaxed">
              Every milestone, every update, perfectly synced. Know exactly where your project
              stands at any moment.
            </p>
          </div>
          <div>
            <div className="w-12 h-12 bg-black rounded-lg mb-6 flex items-center justify-center line-through decoration-white text-white italic font-serif">
              H
            </div>
            <h3 className="text-xl font-bold mb-4">Seamless Delivery</h3>
            <p className="text-gray-500 leading-relaxed">
              From kickoff to final handoff, experience a delivery process that feels lighter than
              air.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm font-bold tracking-tighter text-gray-400 uppercase">
            HORIZON &copy; 2025
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <Link href="#" className="hover:text-black">
              Privacy
            </Link>
            <Link href="#" className="hover:text-black">
              Terms
            </Link>
            <Link href="#" className="hover:text-black">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
