'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { buildRound } from './game-logic'
import type { RoundState } from './game-logic'

export interface GameConfig {
  playerCount: number
  words: string[]
}

// Backward-compat alias used by setup page
export type GameState = GameConfig

interface GameContextType {
  gameConfig: GameConfig | null
  setGameConfig: (config: GameConfig) => void
  // Backward-compat – setup page calls setGameState
  setGameState: (config: GameConfig) => void
  roundState: RoundState | null
  startRound: () => void
  nextPlayer: () => void
  startDiscussion: () => void
  toggleTimer: () => void
  startVoting: () => void
  castVote: (playerIndex: number) => void
  showResults: () => void
  playAgain: () => void
}

const GameContext = createContext<GameContextType | null>(null)

interface GameProviderProps {
  children: ReactNode
  initialConfig?: GameConfig
  initialRound?: RoundState
}

export function GameProvider({ children, initialConfig, initialRound }: GameProviderProps) {
  const [gameConfig, setGameConfigState] = useState<GameConfig | null>(initialConfig ?? null)
  const [roundState, setRoundState] = useState<RoundState | null>(initialRound ?? null)

  const setGameConfig = (config: GameConfig) => setGameConfigState(config)

  const startRound = () => {
    if (!gameConfig) return
    setRoundState(buildRound(gameConfig.playerCount, gameConfig.words))
  }

  const nextPlayer = () => {
    setRoundState(prev => {
      if (!prev || !gameConfig) return prev
      const next = prev.currentPlayerIndex + 1
      if (next >= gameConfig.playerCount) {
        return { ...prev, allRevealed: true }
      }
      return { ...prev, currentPlayerIndex: next }
    })
  }

  const startDiscussion = () => {
    setRoundState(prev => prev ? { ...prev, phase: 'discussion' } : prev)
  }

  const toggleTimer = () => {
    setRoundState(prev => prev ? { ...prev, timerEnabled: !prev.timerEnabled } : prev)
  }

  const startVoting = () => {
    setRoundState(prev => prev ? { ...prev, phase: 'voting' } : prev)
  }

  const castVote = (playerIndex: number) => {
    setRoundState(prev => {
      if (!prev) return prev
      return { ...prev, votes: [...prev.votes, playerIndex] }
    })
  }

  const showResults = () => {
    setRoundState(prev => prev ? { ...prev, phase: 'results' } : prev)
  }

  const playAgain = () => {
    if (!gameConfig) return
    setRoundState(buildRound(gameConfig.playerCount, gameConfig.words))
  }

  const ctx: GameContextType = {
    gameConfig,
    setGameConfig,
    setGameState: setGameConfig,
    roundState,
    startRound,
    nextPlayer,
    startDiscussion,
    toggleTimer,
    startVoting,
    castVote,
    showResults,
    playAgain,
  }

  return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
