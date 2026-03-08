import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      {/* Glow blob */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-700 opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
          <span className="text-4xl font-black text-white select-none">?</span>
        </div>

        <div>
          <h1 className="text-5xl font-black tracking-tight text-white">Imposter</h1>
          <p className="mt-3 text-slate-400 text-lg leading-relaxed">
            One player is the imposter. Everyone else knows the word. Can you find them?
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/game/setup"
            className="btn-primary text-lg py-4 w-full rounded-2xl shadow-lg shadow-violet-900/40"
          >
            Play Now
          </Link>
          <Link
            href="/auth/signup"
            className="btn-secondary text-base w-full rounded-2xl"
          >
            Create Account
          </Link>
        </div>

        <p className="text-slate-500 text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
