export type GamePhase = 'reveal' | 'discussion' | 'voting' | 'results'

export interface RoundState {
  word: string
  imposterIndices: number[]
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

export function assignImposters(playerCount: number, imposterCount: number): number[] {
  const indices = Array.from({ length: playerCount }, (_, i) => i)
  // Fisher-Yates shuffle then take first imposterCount
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.slice(0, imposterCount).sort((a, b) => a - b)
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

export function isImposterCaught(votes: number[], imposterIndices: number[]): boolean {
  return imposterIndices.includes(tallyVotes(votes))
}

export function buildRound(
  playerCount: number,
  words: string[],
  imposterCount = 1,
): RoundState {
  return {
    word: pickWord(words),
    imposterIndices: assignImposters(playerCount, imposterCount),
    currentPlayerIndex: 0,
    allRevealed: false,
    phase: 'reveal',
    votes: [],
    timerEnabled: false,
    timerSeconds: 60,
  }
}
