'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FullPageSpinner, Spinner } from '@/components/Spinner'

interface Word { id: string; word: string }
interface ShareCode { access_type: 'edit' | 'view'; share_code: string }
interface Collection {
  id: string
  name: string
  access_type: 'owner' | 'edit' | 'view'
  words: Word[]
  share_codes?: ShareCode[]
}

export default function EditCollectionPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [col, setCol] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [name, setName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  const [newWord, setNewWord] = useState('')
  const [wordLoading, setWordLoading] = useState(false)

  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState<'edit' | 'view' | null>(null)
  const [revokeLoading, setRevokeLoading] = useState<'edit' | 'view' | null>(null)
  const [copied, setCopied] = useState<'edit' | 'view' | null>(null)

  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setCol(data); setName(data.name) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const reloadCollection = () => {
    fetch(`/api/collections/${id}`)
      .then(r => r.json())
      .then(data => { setCol(data); setName(data.name) })
  }

  const saveName = async () => {
    if (!name.trim() || name === col?.name) return
    setNameLoading(true)
    const r = await fetch(`/api/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setNameLoading(false)
    if (r.ok) setCol(prev => prev ? { ...prev, name } : prev)
    else setError('Failed to rename')
  }

  const addWord = async (wordsToAdd: string[]) => {
    const clean = wordsToAdd.map(w => w.trim()).filter(Boolean)
    if (!clean.length) return
    setWordLoading(true)
    const r = await fetch(`/api/collections/${id}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean.length === 1 ? { word: clean[0] } : { words: clean }),
    })
    setWordLoading(false)
    if (r.ok) { setNewWord(''); reloadCollection() }
    else setError('Failed to add word')
  }

  const removeWord = async (wordId: string) => {
    setCopyingId(wordId)
    await fetch(`/api/words/${wordId}`, { method: 'DELETE' })
    setCopyingId(null)
    setCol(prev => prev ? { ...prev, words: prev.words.filter(w => w.id !== wordId) } : prev)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = text.split(/[\n,]/).map(w => w.trim()).filter(Boolean)
      addWord(parsed)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const generateShareCode = async (type: 'edit' | 'view') => {
    setShareLoading(type)
    const r = await fetch(`/api/collections/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_type: type }),
    })
    setShareLoading(null)
    if (r.ok) reloadCollection()
    else setError('Failed to generate share code')
  }

  const revokeShareCode = async (type: 'edit' | 'view') => {
    setRevokeLoading(type)
    await fetch(`/api/collections/${id}/share?type=${type}`, { method: 'DELETE' })
    setRevokeLoading(null)
    reloadCollection()
  }

  const copyToClipboard = async (code: string, type: 'edit' | 'view') => {
    await navigator.clipboard.writeText(code)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <FullPageSpinner />

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Collection not found</h1>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block">Back to Lists</Link>
        </div>
      </div>
    )
  }

  const isOwner = col?.access_type === 'owner'
  const canEdit = col?.access_type === 'owner' || col?.access_type === 'edit'
  const editCode = col?.share_codes?.find(c => c.access_type === 'edit')
  const viewCode = col?.share_codes?.find(c => c.access_type === 'view')

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">←</Link>
          <div>
            <h1 className="text-lg font-bold text-white">{col?.name}</h1>
            <p className="text-slate-500 text-xs capitalize">{col?.access_type} access</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {error && <p role="alert" className="error-msg">{error}</p>}

        {/* Rename */}
        {canEdit && (
          <section className="card p-5">
            <h2 className="font-semibold text-white mb-3">List Name</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName() }}
                className="input"
                aria-label="Collection name"
              />
              <button
                onClick={saveName}
                disabled={nameLoading || name === col?.name || !name.trim()}
                className="btn-secondary whitespace-nowrap"
              >
                {nameLoading ? <Spinner size="sm" /> : 'Save'}
              </button>
            </div>
          </section>
        )}

        {/* Add words */}
        {canEdit && (
          <section className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Add Words</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWord([newWord]) } }}
                placeholder="Type a word…"
                className="input"
                aria-label="New word"
              />
              <button
                onClick={() => addWord([newWord])}
                disabled={wordLoading || !newWord.trim()}
                className="btn-secondary whitespace-nowrap"
              >
                {wordLoading ? <Spinner size="sm" /> : 'Add'}
              </button>
            </div>
            <div>
              <label className="label text-slate-400 text-xs mb-1 block">Or upload .txt / .csv (one per line or comma-separated)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={handleFileUpload}
                className="block text-slate-300 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
                aria-label="Upload word list"
              />
            </div>
          </section>
        )}

        {/* Word list */}
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Words</h2>
            <span className="text-slate-500 text-sm">{col?.words.length ?? 0}</span>
          </div>
          {col?.words.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500 text-sm">No words yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {col?.words.map(w => (
                <li key={w.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-white">{w.word}</span>
                  {canEdit && (
                    <button
                      onClick={() => removeWord(w.id)}
                      disabled={copyingId === w.id}
                      aria-label={`Remove ${w.word}`}
                      className="text-slate-500 hover:text-rose-400 transition-colors text-lg leading-none"
                    >
                      {copyingId === w.id ? '…' : '×'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Share section — owner only */}
        {isOwner && (
          <section className="card p-5 space-y-5">
            <h2 className="font-semibold text-white">Share</h2>

            {(['edit', 'view'] as const).map(type => {
              const existing = type === 'edit' ? editCode : viewCode
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium capitalize">{type === 'edit' ? 'Edit Access' : 'View Only'}</p>
                      <p className="text-slate-500 text-xs">
                        {type === 'edit' ? 'Anyone with this code can add/remove words' : 'Anyone with this code can view and use the list'}
                      </p>
                    </div>
                    {!existing ? (
                      <button
                        onClick={() => generateShareCode(type)}
                        disabled={shareLoading === type}
                        className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                      >
                        {shareLoading === type ? <Spinner size="sm" /> : 'Generate'}
                      </button>
                    ) : (
                      <button
                        onClick={() => revokeShareCode(type)}
                        disabled={revokeLoading === type}
                        className="text-rose-400 hover:text-rose-300 text-sm transition-colors whitespace-nowrap"
                      >
                        {revokeLoading === type ? '…' : 'Revoke'}
                      </button>
                    )}
                  </div>
                  {existing && (
                    <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-2">
                      <code className="text-violet-300 font-mono flex-1 text-sm">{existing.share_code}</code>
                      <button
                        onClick={() => copyToClipboard(existing.share_code, type)}
                        className="text-slate-400 hover:text-white text-xs transition-colors whitespace-nowrap"
                      >
                        {copied === type ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {/* Copy to My Lists — view-only shared users */}
        {col?.access_type === 'view' && (
          <section className="card p-5">
            <h2 className="font-semibold text-white mb-1">Copy to My Lists</h2>
            <p className="text-slate-400 text-sm mb-4">Make your own editable copy of this list.</p>
            <button
              onClick={() => router.push(`/collections/${id}/copy`)}
              className="btn-secondary"
            >
              Copy to My Lists
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
