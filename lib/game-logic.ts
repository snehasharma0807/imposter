export type GamePhase = 'reveal' | 'discussion' | 'voting' | 'results'

export interface RoundState {
  word: string
  imposterIndex: number
  currentPlayerIndex: number
  allRevealed: boolean
  phase: GamePhase
  votes: number[]
  timerEnabled: boolean
  timerSeconds: number
}

export function pickWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)]
}

export function assignImposter(playerCount: number): number {
  return Math.floor(Math.random() * playerCount)
}

export function tallyVotes(votes: number[]): number {
  const counts: Record<number, number> = {}
  for (const v of votes) {
    counts[v] = (counts[v] ?? 0) + 1
  }
  let maxCount = -1
  let winner = 0
  for (const [idx, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      winner = Number(idx)
    }
  }
  return winner
}

export function isImposterCaught(votes: number[], imposterIndex: number): boolean {
  return tallyVotes(votes) === imposterIndex
}

export function buildRound(playerCount: number, words: string[]): RoundState {
  return {
    word: pickWord(words),
    imposterIndex: assignImposter(playerCount),
    currentPlayerIndex: 0,
    allRevealed: false,
    phase: 'reveal',
    votes: [],
    timerEnabled: false,
    timerSeconds: 60,
  }
}
