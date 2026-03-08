/// <reference types="@jest/globals" />

import {
  pickWord,
  assignImposter,
  tallyVotes,
  isImposterCaught,
  buildRound,
} from '@/lib/game-logic'

describe('game-logic pure functions', () => {
  // ── pickWord ──────────────────────────────────────────────────────────────
  test('pickWord returns a word from the list', () => {
    const words = ['Apple', 'Banana', 'Cherry']
    for (let i = 0; i < 20; i++) {
      expect(words).toContain(pickWord(words))
    }
  })

  // ── assignImposter ────────────────────────────────────────────────────────
  test('assignImposter returns a valid player index', () => {
    for (let playerCount = 3; playerCount <= 10; playerCount++) {
      const idx = assignImposter(playerCount)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(playerCount)
    }
  })

  // ── tallyVotes ────────────────────────────────────────────────────────────
  test('tallyVotes returns the index with the most votes', () => {
    expect(tallyVotes([0, 1, 1, 2, 1])).toBe(1)
    expect(tallyVotes([2, 2, 0, 2])).toBe(2)
    expect(tallyVotes([0, 0, 1])).toBe(0)
  })

  test('tallyVotes handles a single vote', () => {
    expect(tallyVotes([3])).toBe(3)
  })

  // ── isImposterCaught ──────────────────────────────────────────────────────
  test('isImposterCaught returns true when most votes point to the imposter', () => {
    expect(isImposterCaught([1, 1, 0, 1], 1)).toBe(true)
  })

  test('isImposterCaught returns false when most votes do not point to the imposter', () => {
    expect(isImposterCaught([0, 0, 1, 2], 1)).toBe(false)
  })

  // ── buildRound ────────────────────────────────────────────────────────────
  test('buildRound produces exactly one imposter within valid range', () => {
    const words = ['A', 'B', 'C', 'D', 'E']
    const playerCount = 5
    for (let i = 0; i < 30; i++) {
      const round = buildRound(playerCount, words)
      expect(round.imposterIndex).toBeGreaterThanOrEqual(0)
      expect(round.imposterIndex).toBeLessThan(playerCount)
    }
  })

  test('buildRound picks a word from the supplied list', () => {
    const words = ['Lion', 'Tiger', 'Bear']
    const round = buildRound(4, words)
    expect(words).toContain(round.word)
  })

  test('buildRound initialises phase to reveal and votes to empty array', () => {
    const round = buildRound(4, ['X'])
    expect(round.phase).toBe('reveal')
    expect(round.votes).toEqual([])
    expect(round.currentPlayerIndex).toBe(0)
    expect(round.allRevealed).toBe(false)
  })
})
