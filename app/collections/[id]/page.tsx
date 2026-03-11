'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Spinner, FullPageSpinner } from '@/components/Spinner'

interface Word { id: string; word: string; created_at: string }
interface Collection { id: string; name: string; share_code: string; created_at: string; words: Word[] }

export default function CollectionPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newWord, setNewWord] = useState('')
  const [addingWord, setAddingWord] = useState(false)
  const [wordError, setWordError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Collection not found')
        return res.json()
      })
      .then(data => { setCollection(data); setNewName(data.name) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const addWord = async () => {
    const w = newWord.trim()
    if (!w) return
    setAddingWord(true)
    setWordError('')
    const res = await fetch(`/api/collections/${id}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: w }),
    })
    if (!res.ok) {
      setWordError('Failed to add word')
    } else {
      const added = await res.json()
      setCollection(prev => prev ? { ...prev, words: [...prev.words, added] } : prev)
      setNewWord('')
    }
    setAddingWord(false)
  }

  const deleteWord = async (wordId: string) => {
    const res = await fetch(`/api/words/${wordId}`, { method: 'DELETE' })
    if (res.ok) {
      setCollection(prev => prev ? { ...prev, words: prev.words.filter(w => w.id !== wordId) } : prev)
    }
  }

  const updateName = async () => {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    if (res.ok) {
      setCollection(prev => prev ? { ...prev, name: newName } : prev)
      setEditingName(false)
    }
  }

  const deleteCollection = async () => {
    if (!confirm('Delete this collection? This cannot be undone.')) return
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard')
  }

  const copyShareLink = () => {
    if (!collection) return
    navigator.clipboard.writeText(`${window.location.origin}/collections/import/${collection.share_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <FullPageSpinner />

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Collection not found</h1>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors shrink-0">←</Link>
            {editingName ? (
              <div className="flex items-center gap-2 min-w-0">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input py-1 px-3 text-sm min-w-0"
                  aria-label="Collection name"
                />
                <button onClick={updateName} className="btn-primary py-1 px-3 text-sm">Save</button>
                <button onClick={() => { setEditingName(false); setNewName(collection.name) }} className="btn-secondary py-1 px-3 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">{collection.name}</h1>
                <button onClick={() => setEditingName(true)} className="text-slate-500 hover:text-slate-300 text-xs shrink-0">Edit</button>
              </div>
            )}
          </div>
          <button onClick={deleteCollection} className="btn-danger py-1 px-3 text-sm shrink-0">Delete</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">Share code</p>
            <p className="font-mono text-violet-300 font-semibold">{collection.share_code}</p>
          </div>
          <button onClick={copyShareLink} className="btn-secondary py-2 px-4 text-sm shrink-0">
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-white mb-3">Add a word</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWord() } }}
              placeholder="Enter a word"
              className="input"
              aria-label="New word"
            />
            <button onClick={addWord} disabled={addingWord} className="btn-primary whitespace-nowrap">
              {addingWord ? 'Adding…' : 'Add'}
            </button>
          </div>
          {wordError && <p role="alert" className="error-msg mt-3">{wordError}</p>}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Words</h2>
            <span className="text-slate-500 text-sm">{collection.words.length}</span>
          </div>
          {collection.words.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No words yet. Add some above!</div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {collection.words.map(word => (
                <li key={word.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-white">{word.word}</span>
                  <button
                    onClick={() => deleteWord(word.id)}
                    className="text-slate-600 hover:text-rose-400 text-sm transition-colors"
                    aria-label={`Delete ${word.word}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
