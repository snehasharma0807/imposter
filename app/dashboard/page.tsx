'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import { Spinner } from '@/components/Spinner'

interface Collection {
  id: string
  name: string
  share_code?: string
  created_at: string
  access_type: 'owner' | 'edit' | 'view'
}

function CollectionCard({ col }: { col: Collection }) {
  const canEdit = col.access_type === 'owner' || col.access_type === 'edit'
  const badge = col.access_type === 'owner' ? null : col.access_type === 'edit' ? 'Edit Access' : 'View Only'

  return (
    <div className="card p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-white truncate">{col.name}</p>
        {badge && <span className="text-xs text-violet-400 capitalize">{badge}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canEdit ? (
          <Link href={`/collections/${col.id}/edit`} className="btn-secondary text-sm py-1.5 px-3 rounded-lg">
            Edit
          </Link>
        ) : (
          <Link href={`/collections/${col.id}/edit`} className="btn-secondary text-sm py-1.5 px-3 rounded-lg">
            View
          </Link>
        )}
        {col.access_type === 'view' && (
          <Link href={`/collections/${col.id}/copy`} className="text-violet-400 hover:text-violet-300 text-sm transition-colors whitespace-nowrap">
            Copy
          </Link>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importCode, setImportCode] = useState('')
  const router = useRouter()

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

  const myLists = collections.filter(c => c.access_type === 'owner')
  const sharedEdit = collections.filter(c => c.access_type === 'edit')
  const sharedView = collections.filter(c => c.access_type === 'view')

  const handleImport = () => {
    const code = importCode.trim().toUpperCase()
    if (!code) return
    router.push(`/collections/import/${code}`)
  }

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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">List Management</h1>
          <p className="text-slate-400 text-sm mt-1">Word lists for your games</p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="error-msg">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* My Lists */}
            <section className="space-y-3">
              <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wide">My Lists</h2>
              {myLists.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-slate-500 text-sm mb-4">No lists yet.</p>
                  <Link href="/collections/new" className="btn-primary">
                    Create your first collection
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {myLists.map(col => <li key={col.id}><CollectionCard col={col} /></li>)}
                </ul>
              )}
            </section>

            {/* Shared With Me — Edit */}
            {sharedEdit.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wide">Shared With Me (Edit Access)</h2>
                <ul className="space-y-2">
                  {sharedEdit.map(col => <li key={col.id}><CollectionCard col={col} /></li>)}
                </ul>
              </section>
            )}

            {/* Shared With Me — View */}
            {sharedView.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wide">Shared With Me (View Only)</h2>
                <ul className="space-y-2">
                  {sharedView.map(col => <li key={col.id}><CollectionCard col={col} /></li>)}
                </ul>
              </section>
            )}

            {/* Import via Code */}
            <section className="card p-5">
              <h2 className="font-semibold text-white mb-1">Import via Code</h2>
              <p className="text-slate-400 text-sm mb-4">Enter a share code to preview and import a list.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importCode}
                  onChange={e => setImportCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleImport() }}
                  placeholder="e.g. ABC12345"
                  className="input font-mono"
                  aria-label="Import share code"
                />
                <button
                  onClick={handleImport}
                  disabled={!importCode.trim()}
                  className="btn-primary whitespace-nowrap"
                >
                  Import
                </button>
              </div>
            </section>
          </>
        )}

        <div className="pt-4 border-t border-slate-800">
          <Link href="/game/setup" className="btn-primary w-full py-4 text-lg rounded-2xl">
            Play a Game
          </Link>
        </div>
      </main>
    </div>
  )
}
