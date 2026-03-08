export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${dim} animate-spin rounded-full border-2 border-slate-700 border-t-violet-500`}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  )
}
