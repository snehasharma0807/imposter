'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useGame } from '@/lib/GameContext'

export default function GamePlayPage() {
  const router = useRouter()
  const {
    gameConfig, roundState,
    startRound, startDiscussion,
    toggleTimer, showResults,
  } = useGame()

  const [timeLeft, setTimeLeft] = useState(60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reveal phase local state
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const [seenPlayers, setSeenPlayers] = useState<Set<number>>(new Set())
  const [starter, setStarter] = useState<number | null>(null)

  useEffect(() => {
    if (!gameConfig) { router.replace('/game/setup'); return }
    if (!roundState) startRound()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset reveal state when a new round starts (word changes each round)
  useEffect(() => {
    setConfirmingIndex(null)
    setViewingIndex(null)
    setSeenPlayers(new Set())
    setStarter(null)
  }, [roundState?.word]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!roundState) return
    if (roundState.phase === 'discussion' && roundState.timerEnabled) {
      setTimeLeft(roundState.timerSeconds)
      timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [roundState?.phase, roundState?.timerEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!gameConfig || !roundState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading game...</p>
      </div>
    )
  }

  const { phase, imposterIndices, word, timerEnabled } = roundState
  const { playerCount, playerNames, imposterCount } = gameConfig
  const name = (i: number) => playerNames[i] ?? `Player ${i + 1}`

  const handleCardClick = (i: number) => {
    if (confirmingIndex === i) {
      setViewingIndex(i)
      setConfirmingIndex(null)
    } else {
      setConfirmingIndex(i)
    }
  }

  const handleDoneViewing = () => {
    const newSeen = new Set([...seenPlayers, viewingIndex!])
    setViewingIndex(null)
    setSeenPlayers(newSeen)

    if (newSeen.size >= playerCount) {
      const nonImposters = Array.from({ length: playerCount }, (_, i) => i)
        .filter(i => !imposterIndices.includes(i))
      const pool =
        nonImposters.length > 0 && Math.random() < 0.8
          ? nonImposters
          : imposterIndices
      setStarter(pool[Math.floor(Math.random() * pool.length)])
    }
  }

  // REVEAL PHASE
  if (phase === 'reveal') {

    if (starter !== null) {
      return (
        <Screen>
          <div className="text-center space-y-8 max-w-sm w-full">
            <div className="w-20 h-20 rounded-3xl bg-violet-900/50 flex items-center justify-center mx-auto">
              <span className="text-4xl">🎲</span>
            </div>
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-widest mb-3">Goes first</p>
              <h2 className="text-4xl font-black text-white">{name(starter)}</h2>
            </div>
            <button onClick={startDiscussion} className="btn-primary text-lg py-4 px-10 rounded-2xl">
              Start Discussion
            </button>
          </div>
        </Screen>
      )
    }

    if (viewingIndex !== null) {
      const isImposter = imposterIndices.includes(viewingIndex)
      return (
        <Screen>
          <div className="text-center space-y-8 max-w-sm w-full">
            <p className="text-slate-400 text-sm uppercase tracking-widest">
              {name(viewingIndex)}&rsquo;s role
            </p>
            <div
              className={`w-full py-12 rounded-3xl flex flex-col items-center justify-center shadow-2xl gap-3 ${
                isImposter
                  ? 'bg-gradient-to-br from-rose-700 to-red-900 shadow-rose-900/40'
                  : 'bg-gradient-to-br from-violet-700 to-indigo-900 shadow-violet-900/40'
              }`}
            >
              <p className="text-4xl font-black tracking-wide text-white">
                {isImposter ? 'IMPOSTER' : word}
              </p>
              {isImposter && (
                <p className="text-rose-200 text-sm">Blend in!</p>
              )}
            </div>
            <button onClick={handleDoneViewing} className="btn-secondary w-full py-4 rounded-2xl">
              Done
            </button>
          </div>
        </Screen>
      )
    }

    return (
      <Screen>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Tap your name</h2>
            <p className="text-slate-400 text-sm mt-1">
              {seenPlayers.size} / {playerCount} ready
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: playerCount }, (_, i) => {
              const seen = seenPlayers.has(i)
              const confirming = confirmingIndex === i
              return (
                <button
                  key={i}
                  onClick={() => handleCardClick(i)}
                  disabled={seen}
                  className={`p-4 rounded-2xl font-semibold text-center transition-all ${
                    seen
                      ? 'bg-slate-800/50 text-slate-600 cursor-default'
                      : confirming
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50 scale-[1.04]'
                      : 'card text-white hover:border-slate-600'
                  }`}
                >
                  <span className="block truncate">
                    {seen ? '✓' : name(i)}
                  </span>
                  {confirming && (
                    <span className="block text-xs mt-1 text-violet-200">Tap again to reveal</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Screen>
    )
  }

  // DISCUSSION PHASE
  if (phase === 'discussion') {
    return (
      <Screen>
        <div className="text-center space-y-6 w-full max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-amber-900/50 flex items-center justify-center mx-auto">
            <span className="text-4xl">💬</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Discussion</h2>
            <p className="text-slate-400 mt-2">
              Who {imposterCount > 1 ? 'are the imposters' : 'is the imposter'}?
            </p>
          </div>

          {timerEnabled && (
            <p
              className={`text-6xl font-black tabular-nums ${timeLeft <= 10 ? 'text-rose-400' : 'text-white'}`}
              role="timer"
              aria-live="polite"
            >
              {timeLeft}s
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={showResults} className="btn-primary text-lg py-4 rounded-2xl">Reveal Imposter</button>
            <button onClick={toggleTimer} className="btn-ghost text-sm">
              {timerEnabled ? 'Disable Timer' : 'Enable Timer'}
            </button>
          </div>
        </div>
      </Screen>
    )
  }

  // RESULTS PHASE
  if (phase === 'results') {
    return (
      <Screen>
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-violet-900/50 flex items-center justify-center mx-auto">
            <span className="text-5xl">🕵️</span>
          </div>

          <div>
            <h2 className="text-3xl font-black text-white">
              {imposterCount > 1 ? 'The Imposters' : 'The Imposter'}
            </h2>
            <p className="text-2xl font-bold text-violet-300 mt-2">
              {imposterIndices.map(i => name(i)).join(' & ')}
            </p>
          </div>

          <div className="card p-4 text-left">
            <p className="text-slate-300">
              The word was <span className="font-bold text-white">{word}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => router.push('/game/setup?resume=1')} className="btn-primary w-full text-lg py-4 rounded-2xl">
              Play Again
            </button>
            <Link href="/game/setup" className="btn-secondary w-full text-base py-3 rounded-2xl text-center">
              Home
            </Link>
          </div>
        </div>
      </Screen>
    )
  }

  return null
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 py-8">
      <div className="absolute top-4 left-4">
        <Link href="/game/setup" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
          Home
        </Link>
      </div>
      {children}
    </div>
  )
}
