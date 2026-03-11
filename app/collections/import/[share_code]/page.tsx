'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { FullPageSpinner, Spinner } from '@/components/Spinner'

interface Word { id: string; word: string }
interface Collection { id: string; name: string; access_type: 'edit' | 'view'; words: Word[] }

export default function ImportCollectionPage() {
  const params = useParams()
  const shareCode = params.share_code as string
  const router = useRouter()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Try new collection_access-based import endpoint first
      const res = await fetch(`/api/collections/import/${shareCode}`)
      if (res.ok) {
        setCollection(await res.json())
      } else {
        // Fallback: old-style share_code on collections table
        const fallback = await fetch(`/api/collections/share/${shareCode}`)
        if (fallback.ok) {
          const data = await fallback.json()
          setCollection({ ...data, access_type: 'view' })
        } else {
          setNotFound(true)
        }
      }
      setLoading(false)
    }
    load()
  }, [shareCode])

  const addToMyGame = async () => {
    setSaving(true)
    setSaveError('')
    // Try new import endpoint
    const res = await fetch(`/api/collections/import/${shareCode}`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      router.push(`/collections/${data.id}/edit`)
      return
    }
    // Fallback: old-style clone
    const fallback = await fetch(`/api/collections/share/${shareCode}`, { method: 'POST' })
    if (!fallback.ok) {
      const data = await fallback.json().catch(() => ({}))
      setSaveError(data.error || 'Failed to import')
      setSaving(false)
      return
    }
    const newCol = await fallback.json()
    router.push(`/collections/${newCol.id}/edit`)
  }

  if (loading) return <FullPageSpinner />

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">List not found</h1>
          <p className="text-slate-400 text-sm mb-6">This share code does not match any list.</p>
          <Link href="/" className="btn-primary">Go home</Link>
        </div>
      </div>
    )
  }

  const accessLabel = collection!.access_type === 'edit' ? 'Edit Access — you can modify this list' : 'View Only — you can use this list in games'

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">←</Link>
            <h1 className="text-lg font-bold text-white truncate">{collection!.name}</h1>
          </div>
          {isLoggedIn ? (
            <button onClick={addToMyGame} disabled={saving} className="btn-primary py-2 px-4 text-sm">
              {saving ? <><Spinner size="sm" /> Saving…</> : 'Add to My Game'}
            </button>
          ) : (
            <Link href={`/auth/login?next=/collections/import/${shareCode}`} className="btn-primary py-2 px-4 text-sm">
              Log in to Import
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="card p-4 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${collection!.access_type === 'edit' ? 'bg-violet-500' : 'bg-amber-500'}`} />
          <p className="text-slate-300 text-sm">{accessLabel}</p>
        </div>

        {saveError && <p role="alert" className="error-msg">{saveError}</p>}

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Words</h2>
            <span className="text-slate-500 text-sm">{collection!.words?.length || 0}</span>
          </div>
          {collection!.words && collection!.words.length > 0 ? (
            <ul className="divide-y divide-slate-800">
              {collection!.words.map(word => (
                <li key={word.id} className="px-5 py-3 text-white">{word.word}</li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">This list has no words.</div>
          )}
        </div>
      </main>
    </div>
  )
}
