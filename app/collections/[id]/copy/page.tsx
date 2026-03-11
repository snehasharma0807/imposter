'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Spinner } from '@/components/Spinner'

export default function CopyCollectionPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const r = await fetch(`/api/collections/${id}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) {
      const data = await r.json().catch(() => ({}))
      setError(data.error || 'Failed to copy')
      setLoading(false)
      return
    }
    const newCol = await r.json()
    router.push(`/collections/${newCol.id}/edit`)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/collections/${id}/edit`} className="text-slate-400 hover:text-white transition-colors">←</Link>
          <h1 className="text-lg font-bold text-white">Copy to My Lists</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleCopy} className="card p-6 space-y-4">
          <p className="text-slate-400 text-sm">Give your copy a name. It will be saved as a new independent list under your account.</p>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. My Animals"
            className="input"
            aria-label="Name for copy"
          />
          {error && <p role="alert" className="error-msg">{error}</p>}
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full py-3">
            {loading ? <><Spinner size="sm" /> Copying…</> : 'Create Copy'}
          </button>
        </form>
      </main>
    </div>
  )
}
