'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGame } from '@/lib/GameContext'
import { isImposterCaught, tallyVotes } from '@/lib/game-logic'

export default function GamePlayPage() {
  const router = useRouter()
  const {
    gameConfig, roundState,
    startRound, nextPlayer, startDiscussion,
    toggleTimer, startVoting, castVote, showResults, playAgain,
  } = useGame()

  const [timeLeft, setTimeLeft] = useState(60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!gameConfig) { router.replace('/game/setup'); return }
    if (!roundState) startRound()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        <p className="text-slate-400">Loading game…</p>
      </div>
    )
  }

  const { phase, currentPlayerIndex, allRevealed, imposterIndex, word, votes, timerEnabled } = roundState
  const playerCount = gameConfig.playerCount

  // ── REVEAL PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const playerNum = currentPlayerIndex + 1
    const isImposter = currentPlayerIndex === imposterIndex

    if (!allRevealed) {
      return (
        <Screen>
          <PassScreen
            key={currentPlayerIndex}
            playerNum={playerNum}
            word={isImposter ? 'IMPOSTER' : word}
            isImposter={isImposter}
            onNext={currentPlayerIndex + 1 >= playerCount ? startDiscussion : nextPlayer}
            isLast={currentPlayerIndex + 1 >= playerCount}
          />
        </Screen>
      )
    }

    return (
      <Screen>
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-violet-900/50 flex items-center justify-center mx-auto">
            <span className="text-4xl">👀</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">All players have seen their role</h2>
            <p className="text-slate-400 mt-2">Time to find the imposter!</p>
          </div>
          <button onClick={startDiscussion} className="btn-primary text-lg py-4 px-10 rounded-2xl">
            Start Discussion
          </button>
        </div>
      </Screen>
    )
  }

  // ── DISCUSSION PHASE ──────────────────────────────────────────────────────────
  if (phase === 'discussion') {
    return (
      <Screen>
        <div className="text-center space-y-6 w-full max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-amber-900/50 flex items-center justify-center mx-auto">
            <span className="text-4xl">💬</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Discussion</h2>
            <p className="text-slate-400 mt-2">Who is the imposter?</p>
          </div>

          {timerEnabled && (
            <p
              className={\`text-6xl font-black tabular-nums \${timeLeft <= 10 ? 'text-rose-400' : 'text-white'}\`}
              role="timer"
              aria-live="polite"
            >
              {timeLeft}s
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={startVoting} className="btn-primary text-lg py-4 rounded-2xl">Vote</button>
            <button onClick={toggleTimer} className="btn-ghost text-sm">
              {timerEnabled ? 'Disable Timer' : 'Enable Timer'}
            </button>
          </div>
        </div>
      </Screen>
    )
  }

  // ── VOTING PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'voting') {
    const allVotesCast = votes.length >= playerCount

    return (
      <Screen>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Vote</h2>
            <p className="text-slate-400 mt-1 text-sm">{votes.length} / {playerCount} votes cast</p>
          </div>

          <ul className="space-y-2">
            {Array.from({ length: playerCount }, (_, i) => (
              <li key={i}>
                <button
                  onClick={() => castVote(i)}
                  className="w-full card p-4 text-left hover:border-violet-600 hover:bg-violet-900/20 transition-all text-white font-medium"
                >
                  Player {i + 1}
                </button>
              </li>
            ))}
          </ul>

          {allVotesCast && (
            <button onClick={showResults} className="btn-primary w-full text-lg py-4 rounded-2xl">
              See Results
            </button>
          )}
        </div>
      </Screen>
    )
  }

  // ── RESULTS PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const caught = isImposterCaught(votes, imposterIndex)
    const mostVoted = tallyVotes(votes)

    return (
      <Screen>
        <div className="w-full max-w-sm space-y-6 text-center">
          <div
            className={\`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto \${caught ? 'bg-emerald-900/50' : 'bg-rose-900/50'}\`}
          >
            <span className="text-5xl">{caught ? '🎉' : '🕵️'}</span>
          </div>

          <div>
            <h2 className={\`text-3xl font-black \${caught ? 'text-emerald-400' : 'text-rose-400'}\`}>
              {caught ? 'Imposter Caught!' : 'Imposter Escaped!'}
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
              {caught ? 'The team wins!' : 'The imposter wins!'}
            </p>
          </div>

          <div className="card p-4 text-left space-y-2">
            <p className="text-slate-300">
              Imposter was{'  '}
              <span className="font-bold text-violet-300">Player {imposterIndex + 1}</span>
            </p>
            <p className="text-slate-300">
              The word was{'  '}
              <span className="font-bold text-white">{word}</span>
            </p>
            <p className="text-slate-300">
              Most voted:{'  '}
              <span className="font-bold">Player {mostVoted + 1}</span>
            </p>
          </div>

          <button onClick={playAgain} className="btn-primary w-full text-lg py-4 rounded-2xl">
            Play Again
          </button>
        </div>
      </Screen>
    )
  }

  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 py-8">
      {children}
    </div>
  )
}

function PassScreen({
  playerNum, word, isImposter, onNext, isLast,
}: {
  playerNum: number; word: string; isImposter: boolean; onNext: () => void; isLast: boolean
}) {
  const [revealed, setRevealed] = useState(false)

  if (!revealed) {
    return (
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto">
          <span className="text-5xl font-black text-violet-400">{playerNum}</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Pass to Player {playerNum}</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Make sure only Player {playerNum} can see the screen.
          </p>
        </div>
        <button
          onClick={() => setRevealed(true)}
          className="btn-primary w-full text-lg py-4 rounded-2xl shadow-lg shadow-violet-900/40"
        >
          Reveal
        </button>
      </div>
    )
  }

  return (
    <div className="text-center space-y-8 max-w-sm w-full">
      <div
        className={\`w-full py-10 rounded-3xl flex items-center justify-center shadow-2xl \${
          isImposter
            ? 'bg-gradient-to-br from-rose-700 to-red-900 shadow-rose-900/40'
            : 'bg-gradient-to-br from-violet-700 to-indigo-900 shadow-violet-900/40'
        }\`}
      >
        <p className="text-4xl font-black tracking-wide text-white">{word}</p>
      </div>
      {isImposter && (
        <p className="text-rose-400 text-sm">You are the imposter. Blend in!</p>
      )}
      <button
        key="next-btn"
        onClick={onNext}
        className="btn-secondary w-full py-4 rounded-2xl"
      >
        {isLast ? 'Start Discussion' : 'Next Player →'}
      </button>
    </div>
  )
}
