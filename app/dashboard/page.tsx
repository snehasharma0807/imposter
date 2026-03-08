'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { Spinner } from '@/components/Spinner'

interface Collection {
  id: string
  name: string
  share_code: string
  created_at: string
}

export default function DashboardPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/collections')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load collections')
        return res.json()
      })
      .then(data => setCollections(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-white tracking-tight">Imposter</Link>
          <div className="flex items-center gap-3">
            <Link href="/collections/new" className="btn-primary py-2 px-4 text-sm rounded-xl">
              + New
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">My Collections</h1>
          <p className="text-slate-400 text-sm mt-1">Word lists you can use in games</p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="error-msg">
            {error}
          </p>
        )}

        {!loading && !error && collections.length === 0 && (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No collections yet</h2>
            <p className="text-slate-400 text-sm mb-6">
              Create a word list to use in your next game.
            </p>
            <Link href="/collections/new" className="btn-primary">
              Create your first collection
            </Link>
          </div>
        )}

        {!loading && !error && collections.length > 0 && (
          <ul className="space-y-3">
            {collections.map(col => (
              <li key={col.id}>
                <Link
                  href={`/collections/${col.id}`}
                  className="card p-5 flex items-center justify-between hover:border-slate-700 transition-colors group block"
                >
                  <div>
                    <p className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {col.name}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5 font-mono">{col.share_code}</p>
                  </div>
                  <span className="text-slate-600 group-hover:text-violet-400 text-lg transition-colors">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800">
          <Link href="/game/setup" className="btn-primary w-full py-4 text-lg rounded-2xl">
            Play a Game
          </Link>
        </div>
      </main>
    </div>
  )
}
