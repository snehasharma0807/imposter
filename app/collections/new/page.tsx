'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Spinner } from '@/components/Spinner'

export default function NewCollectionPage() {
  return (
    <Suspense>
      <NewCollectionForm />
    </Suspense>
  )
}

function NewCollectionForm() {
  const [name, setName] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [currentWord, setCurrentWord] = useState('')
  const [bulkWords, setBulkWords] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSetup = searchParams.get('from') === 'setup'

  const addWord = () => {
    const w = currentWord.trim()
    if (w) { setWords(prev => [...prev, w]); setCurrentWord('') }
  }

  const addBulkWords = () => {
    const newWords = bulkWords.split(',').map(w => w.trim()).filter(Boolean)
    setWords(prev => [...prev, ...newWords])
    setBulkWords('')
  }

  const removeWord = (index: number) => setWords(prev => prev.filter((_, i) => i !== index))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = text.split(/[\n,]/).map(w => w.trim()).filter(Boolean)
      setWords(prev => [...prev, ...parsed])
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (words.length === 0) { setError('Add at least one word.'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, words }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create collection')
      setLoading(false)
      return
    }

    const created = await res.json()
    router.push(fromSetup ? `/game/setup?new=${created.id}` : `/collections/${created.id}/edit`)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={fromSetup ? '/game/setup' : '/dashboard'} className="text-slate-400 hover:text-white transition-colors">←</Link>
          <h1 className="text-lg font-bold text-white">New Category</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="card p-5">
            <label htmlFor="name" className="label text-base">Collection name</label>
            <input
              id="name"
              type="text"
              required
              placeholder="e.g. Office Jargon"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
            />
          </div>

          {/* Add words */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-white">Words</h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentWord}
                onChange={e => setCurrentWord(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWord() } }}
                placeholder="Type a word…"
                className="input"
                aria-label="Word to add"
              />
              <button type="button" onClick={addWord} className="btn-secondary whitespace-nowrap">
                Add
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="bulk" className="label">Or paste comma-separated words</label>
              <div className="flex gap-2">
                <textarea
                  id="bulk"
                  value={bulkWords}
                  onChange={e => setBulkWords(e.target.value)}
                  placeholder="Apple, Banana, Cherry"
                  rows={2}
                  className="input resize-none"
                />
                <button type="button" onClick={addBulkWords} className="btn-secondary whitespace-nowrap self-start">
                  Add all
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="csv-upload" className="label">Or upload a .txt / .csv file</label>
              <p className="text-slate-500 text-xs">One word per line, or comma-separated values.</p>
              <input
                id="csv-upload"
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={handleFileUpload}
                className="block text-slate-300 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
                aria-label="Upload word list file"
              />
            </div>

            {words.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-2">{words.length} words</p>
                <div className="flex flex-wrap gap-2">
                  {words.map((word, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 text-sm px-3 py-1 rounded-full"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => removeWord(i)}
                        aria-label={`Remove ${word}`}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p role="alert" className="error-msg">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading ? <><Spinner size="sm" /> Creating…</> : 'Create Collection'}
          </button>
        </form>
      </main>
    </div>
  )
}
