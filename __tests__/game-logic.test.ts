/// <reference types="@jest/globals" />

import {
  pickWord,
  assignImposters,
  tallyVotes,
  isImposterCaught,
  buildRound,
} from '@/lib/game-logic'

describe('game-logic pure functions', () => {
  test('pickWord returns a word from the list', () => {
    const words = ['Apple', 'Banana', 'Cherry']
    for (let i = 0; i < 20; i++) {
      expect(words).toContain(pickWord(words))
    }
  })

  test('assignImposters returns the correct number of unique indices', () => {
    for (let count = 1; count <= 3; count++) {
      const indices = assignImposters(8, count)
      expect(indices).toHaveLength(count)
      expect(new Set(indices).size).toBe(count)
      indices.forEach(i => {
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(8)
      })
    }
  })

  test('assignImposters with count=1 returns exactly one valid index', () => {
    for (let playerCount = 3; playerCount <= 10; playerCount++) {
      const [idx] = assignImposters(playerCount, 1)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(playerCount)
    }
  })

  test('tallyVotes returns the index with the most votes', () => {
    expect(tallyVotes([0, 1, 1, 2, 1])).toBe(1)
    expect(tallyVotes([2, 2, 0, 2])).toBe(2)
    expect(tallyVotes([0, 0, 1])).toBe(0)
  })

  test('tallyVotes handles a single vote', () => {
    expect(tallyVotes([3])).toBe(3)
  })

  test('isImposterCaught returns true when most votes point to an imposter', () => {
    expect(isImposterCaught([1, 1, 0, 1], [1])).toBe(true)
    expect(isImposterCaught([1, 1, 0, 1], [0, 1])).toBe(true)
  })

  test('isImposterCaught returns false when most votes miss all imposters', () => {
    expect(isImposterCaught([0, 0, 1, 2], [1, 2])).toBe(false)
    expect(isImposterCaught([0, 0, 1, 2], [1])).toBe(false)
  })

  test('buildRound produces the correct number of imposters', () => {
    const words = ['A', 'B', 'C', 'D', 'E']
    for (let imposterCount = 1; imposterCount <= 3; imposterCount++) {
      const round = buildRound(8, words, imposterCount)
      expect(round.imposterIndices).toHaveLength(imposterCount)
    }
  })

  test('buildRound defaults to 1 imposter', () => {
    const round = buildRound(4, ['X'])
    expect(round.imposterIndices).toHaveLength(1)
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
