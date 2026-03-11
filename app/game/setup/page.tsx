'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useGame } from '@/lib/GameContext'
import { Spinner, FullPageSpinner } from '@/components/Spinner'

interface DefaultCategory { id: string; name: string; words: string[] }
interface UserCollection { id: string; name: string; share_code?: string; access_type?: string }

function defaultNames(count: number) {
  return Array.from({ length: count }, (_, i) => `Player ${i + 1}`)
}

export default function GameSetupPage() {
  const router = useRouter()
  const { setGameState } = useGame()

  const [playerCount, setPlayerCount] = useState(4)
  const [imposterCount, setImposterCount] = useState(1)
  const [playerNames, setPlayerNames] = useState<string[]>(defaultNames(4))
  const [defaultCategories, setDefaultCategories] = useState<DefaultCategory[]>([])
  const [userCollections, setUserCollections] = useState<UserCollection[]>([])
  const [collectionWords, setCollectionWords] = useState<Record<string, string[]>>({})
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set())
  const [shareCodeInput, setShareCodeInput] = useState('')
  const [loadedShareWords, setLoadedShareWords] = useState<string[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const [uploadedWords, setUploadedWords] = useState<string[]>([])
  const [uploadFileName, setUploadFileName] = useState('')
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
      let collections: UserCollection[] = []
      if (user) {
        setIsLoggedIn(true)
        const colRes = await fetch('/api/collections')
        if (colRes.ok) {
          collections = await colRes.json()
          setUserCollections(collections)
        }
      }

      // Auto-select a newly created collection (?new=<id>)
      const urlParams = new URLSearchParams(window.location.search)
      const newColId = urlParams.get('new')
      if (newColId) {
        setSelectedCollectionIds(prev => new Set([...prev, newColId]))
        const wordsRes = await fetch(`/api/collections/${newColId}`)
        if (wordsRes.ok) {
          const data = await wordsRes.json()
          setCollectionWords(prev => ({
            ...prev,
            [newColId]: (data.words ?? []).map((w: { word: string }) => w.word),
          }))
        }
        window.history.replaceState({}, '', '/game/setup')
      }

      setLoading(false)
    }
    load()
  }, [])

  // Keep playerNames in sync when playerCount changes
  const handlePlayerCountChange = (count: number) => {
    const clamped = Math.min(30, Math.max(1, count))
    setPlayerCount(clamped)
    setPlayerNames(prev => {
      const next = [...prev]
      while (next.length < clamped) next.push(`Player ${next.length + 1}`)
      return next.slice(0, clamped)
    })
    // Clamp imposterCount if needed
    setImposterCount(prev => Math.min(prev, Math.max(1, clamped - 1)))
  }

  const updatePlayerName = (index: number, name: string) => {
    setPlayerNames(prev => prev.map((n, i) => i === index ? name : n))
  }

  const maxImposters = Math.max(1, playerCount - 1)

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
      const res = await fetch(`/api/collections/${col.id}`)
      if (res.ok) {
        const data = await res.json()
        setCollectionWords(prev => ({
          ...prev,
          [col.id]: (data.words ?? []).map((w: { word: string }) => w.word),
        }))
      }
    }
  }

  const loadShareCode = async () => {
    const code = shareCodeInput.trim().toUpperCase()
    if (!code) return
    setShareLoading(true)
    setShareError('')
    const res = await fetch(`/api/collections/share/${code}`)
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = text.split(/[\n,]/).map(w => w.trim()).filter(Boolean)
      setUploadedWords(parsed)
    }
    reader.readAsText(file)
  }

  const selectedWords = useMemo(() => [
    ...defaultCategories.filter(c => selectedCategoryIds.has(c.id)).flatMap(c => c.words),
    ...Array.from(selectedCollectionIds).flatMap(id => collectionWords[id] ?? []),
    ...loadedShareWords,
    ...uploadedWords,
  ], [defaultCategories, selectedCategoryIds, collectionWords, selectedCollectionIds, loadedShareWords, uploadedWords])

  const canStart = playerCount >= 3 && selectedWords.length > 0

  const startGame = () => {
    setGameState({ playerCount, words: selectedWords, imposterCount, playerNames })
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

        {/* Players */}
        <section className="card p-5">
          <h2 className="font-semibold text-white mb-4">Players</h2>

          <div className="flex items-center gap-4 mb-5">
            <input
              type="number"
              min={3}
              max={30}
              value={playerCount}
              onChange={e => handlePlayerCountChange(Number(e.target.value))}
              className="input w-24 text-center text-xl font-bold"
              aria-label="Number of players"
            />
            <span className="text-slate-400 text-sm">players (3–30)</span>
          </div>
          {playerCount < 3 && (
            <p role="alert" className="mt-2 text-rose-400 text-sm">At least 3 players required.</p>
          )}

          <div className="space-y-2">
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-slate-500 text-sm w-6 text-right shrink-0">{i + 1}</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => updatePlayerName(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  className="input py-2 text-sm"
                  aria-label={`Name for player ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Imposters */}
        <section className="card p-5">
          <h2 className="font-semibold text-white mb-1">Imposters</h2>
          <p className="text-slate-400 text-sm mb-4">
            How many players are secretly imposters? (max {maxImposters})
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={1}
              max={maxImposters}
              value={imposterCount}
              onChange={e => setImposterCount(Math.min(maxImposters, Math.max(1, Number(e.target.value))))}
              className="input w-24 text-center text-xl font-bold"
              aria-label="Number of imposters"
            />
            <span className="text-slate-400 text-sm">of {playerCount} players</span>
          </div>
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

        {/* Custom categories */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Custom Categories</h2>
            {isLoggedIn && (
              <Link
                href="/collections/new?from=setup"
                className="btn-secondary text-sm py-2 px-3 rounded-xl"
              >
                + Create New
              </Link>
            )}
          </div>
          {!isLoggedIn ? (
            <p className="text-slate-500 text-sm">
              <Link href="/auth/login" className="text-violet-400 hover:text-violet-300">Sign in</Link> to create and use custom categories.
            </p>
          ) : userCollections.length === 0 ? (
            <p className="text-slate-500 text-sm">No custom categories yet. Create one to get started.</p>
          ) : (
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
                    {col.access_type && col.access_type !== 'owner' && (
                      <span className="text-slate-500 text-xs ml-auto capitalize">{col.access_type}</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
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
