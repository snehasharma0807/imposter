'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useGame } from '@/lib/GameContext'
import { Spinner, FullPageSpinner } from '@/components/Spinner'

interface DefaultCategory { id: string; name: string; words: string[] }
interface UserCollection { id: string; name: string; share_code: string }

export default function GameSetupPage() {
  const router = useRouter()
  const { setGameState } = useGame()

  const [playerCount, setPlayerCount] = useState(4)
  const [defaultCategories, setDefaultCategories] = useState<DefaultCategory[]>([])
  const [userCollections, setUserCollections] = useState<UserCollection[]>([])
  const [collectionWords, setCollectionWords] = useState<Record<string, string[]>>({})
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set())
  const [shareCodeInput, setShareCodeInput] = useState('')
  const [loadedShareWords, setLoadedShareWords] = useState<string[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const catRes = await fetch('/api/default-categories')
      if (catRes.ok) {
        setDefaultCategories(await catRes.json())
      } else {
        setFetchError('Failed to load categories. Please refresh.')
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsLoggedIn(true)
        const colRes = await fetch('/api/collections')
        if (colRes.ok) setUserCollections(await colRes.json())
      }

      setLoading(false)
    }
    load()
  }, [])

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleCollection = async (col: UserCollection) => {
    const wasSelected = selectedCollectionIds.has(col.id)
    setSelectedCollectionIds(prev => {
      const next = new Set(prev)
      if (wasSelected) next.delete(col.id); else next.add(col.id)
      return next
    })
    if (!wasSelected && !collectionWords[col.id]) {
      const res = await fetch(\`/api/collections/\${col.id}\`)
      if (res.ok) {
        const data = await res.json()
        setCollectionWords(prev => ({ ...prev, [col.id]: (data.words ?? []).map((w: { word: string }) => w.word) }))
      }
    }
  }

  const loadShareCode = async () => {
    const code = shareCodeInput.trim().toUpperCase()
    if (!code) return
    setShareLoading(true)
    setShareError('')
    const res = await fetch(\`/api/collections/share/\${code}\`)
    if (!res.ok) {
      setShareError('Collection not found for that share code.')
      setShareLoading(false)
      return
    }
    const data = await res.json()
    const words: string[] = (data.words ?? []).map((w: { word: string }) => w.word)
    setLoadedShareWords(prev => [...prev, ...words])
    setShareCodeInput('')
    setShareLoading(false)
  }

  const selectedWords = useMemo(() => [
    ...defaultCategories.filter(c => selectedCategoryIds.has(c.id)).flatMap(c => c.words),
    ...Array.from(selectedCollectionIds).flatMap(id => collectionWords[id] ?? []),
    ...loadedShareWords,
  ], [defaultCategories, selectedCategoryIds, collectionWords, selectedCollectionIds, loadedShareWords])

  const canStart = playerCount >= 3 && selectedWords.length > 0

  const startGame = () => {
    setGameState({ playerCount, words: selectedWords })
    router.push('/game/play')
  }

  if (loading) return <FullPageSpinner />

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-black text-white tracking-tight">Imposter</Link>
          <h2 className="text-slate-400 text-sm font-medium">Game Setup</h2>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {fetchError && <p role="alert" className="error-msg">{fetchError}</p>}

        {/* Player count */}
        <section className="card p-5">
          <h2 className="font-semibold text-white mb-4">Number of Players</h2>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={3}
              max={10}
              value={playerCount}
              onChange={e => setPlayerCount(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="input w-24 text-center text-xl font-bold"
              aria-label="Number of players"
            />
            <span className="text-slate-400 text-sm">players (3–10)</span>
          </div>
          {playerCount < 3 && (
            <p className="mt-3 text-rose-400 text-sm" role="alert">At least 3 players required.</p>
          )}
        </section>

        {/* Default categories */}
        <section className="card p-5">
          <h2 className="font-semibold text-white mb-4">Word Categories</h2>
          {defaultCategories.length === 0 ? (
            <p className="text-slate-500 text-sm">No categories available.</p>
          ) : (
            <ul className="space-y-2">
              {defaultCategories.map(cat => (
                <li key={cat.id}>
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.has(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="h-5 w-5 rounded accent-violet-500"
                    />
                    <span className="text-white group-hover:text-violet-300 transition-colors font-medium">{cat.name}</span>
                    <span className="text-slate-500 text-sm ml-auto">({cat.words.length} words)</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* User collections */}
        {isLoggedIn && userCollections.length > 0 && (
          <section className="card p-5">
            <h2 className="font-semibold text-white mb-4">Your Collections</h2>
            <ul className="space-y-2">
              {userCollections.map(col => (
                <li key={col.id}>
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <input
                      type="checkbox"
                      checked={selectedCollectionIds.has(col.id)}
                      onChange={() => toggleCollection(col)}
                      className="h-5 w-5 rounded accent-violet-500"
                    />
                    <span className="text-white group-hover:text-violet-300 transition-colors font-medium">{col.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Share code */}
        <section className="card p-5">
          <h2 className="font-semibold text-white mb-1">{'Add a Friend\'s Collection'}</h2>
          <p className="text-slate-400 text-sm mb-4">Enter a share code to pull in their word list.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareCodeInput}
              onChange={e => setShareCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. ABC12345"
              className="input font-mono"
              aria-label="Share code"
            />
            <button
              onClick={loadShareCode}
              disabled={shareLoading || !shareCodeInput.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {shareLoading ? <Spinner size="sm" /> : 'Load'}
            </button>
          </div>
          {shareError && <p role="alert" className="error-msg mt-3">{shareError}</p>}
          {loadedShareWords.length > 0 && (
            <p className="mt-3 text-emerald-400 text-sm">{loadedShareWords.length} words loaded from share codes.</p>
          )}
        </section>

        {/* Summary + Start */}
        <section className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold text-lg">{selectedWords.length} words selected</p>
              {selectedWords.length === 0 && (
                <p className="text-slate-400 text-sm mt-0.5">Select at least one category to start.</p>
              )}
            </div>
            <button
              onClick={startGame}
              disabled={!canStart}
              className="btn-primary text-lg py-4 px-8 rounded-2xl shadow-lg shadow-violet-900/40 shrink-0"
            >
              Start Game
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}
