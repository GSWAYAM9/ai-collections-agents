import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Collections AI</h1>
          <div className="space-x-4">
            <Link
              href="/demo"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition text-sm"
            >
              API Demo
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition text-sm"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Self-Learning AI Collections System
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Intelligent debt collections with adaptive agent strategies, compliance enforcement, and continuous improvement through meta-evaluation.
          </p>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href="/demo"
            className="block p-8 rounded-lg bg-purple-600/10 border border-purple-500/50 hover:border-purple-500 hover:bg-purple-600/20 transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">⚡</span>
              <h3 className="text-xl font-bold text-white">API Demo</h3>
            </div>
            <p className="text-slate-300 text-sm">Test Anthropic Claude and Vapi voice APIs in action</p>
          </Link>

          <Link
            href="/dashboard"
            className="block p-8 rounded-lg bg-blue-600/10 border border-blue-500/50 hover:border-blue-500 hover:bg-blue-600/20 transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📊</span>
              <h3 className="text-xl font-bold text-white">Operational Dashboard</h3>
            </div>
            <p className="text-slate-300 text-sm">Manage cases, run evaluations, and monitor system performance</p>
          </Link>

          <Link
            href="/admin"
            className="block p-8 rounded-lg bg-slate-700/10 border border-slate-500/50 hover:border-slate-500 hover:bg-slate-700/20 transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">⚙️</span>
              <h3 className="text-xl font-bold text-white">Admin Setup</h3>
            </div>
            <p className="text-slate-300 text-sm">Initialize database and configure the system</p>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">3-Agent Pipeline</h3>
            <p className="text-slate-400 text-sm">
              Assessment (Chat) → Resolution (Voice) → Final Notice (Chat)
            </p>
          </div>

          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Self-Learning</h3>
            <p className="text-slate-400 text-sm">
              Auto-generates prompt variants, tests them, adopts winners if compliance maintained
            </p>
          </div>

          <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Compliance</h3>
            <p className="text-slate-400 text-sm">
              All 8 FDCPA rules enforced, cost tracking, meta-evaluation auditing
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-1">3</div>
            <div className="text-sm text-slate-300">Active Agents</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">8</div>
            <div className="text-sm text-slate-300">Compliance Rules</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-1">$20</div>
            <div className="text-sm text-slate-300">Budget Cap</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-1">∞</div>
            <div className="text-sm text-slate-300">Learning Cycles</div>
          </div>
        </div>
      </div>
    </div>
  );
}
