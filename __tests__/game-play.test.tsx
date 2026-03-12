/// <reference types="@jest/globals" />
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider } from '@/lib/GameContext'
import type { RoundState } from '@/lib/game-logic'
import GamePlayPage from '../app/game/play/page'

const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, refresh: jest.fn() }),
}))
jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>
  }
})

const WORDS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']
const PLAYER_COUNT = 4
const PLAYER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave']

function renderPlay(
  playerCount = PLAYER_COUNT,
  imposterIndices = [2],
  roundOverrides: Partial<RoundState> = {},
  playerNames = PLAYER_NAMES.slice(0, playerCount),
  imposterCount = 1,
) {
  const initialRound: RoundState = {
    word: 'Alpha',
    imposterIndices,
    currentPlayerIndex: 0,
    allRevealed: false,
    phase: 'reveal',
    votes: [],
    timerEnabled: false,
    timerSeconds: 60,
    ...roundOverrides,
  }
  const initialConfig = { playerCount, words: WORDS, playerNames, imposterCount }
  return render(
    <GameProvider initialConfig={initialConfig} initialRound={initialRound}>
      <GamePlayPage />
    </GameProvider>
  )
}

describe('Game Play Page', () => {
  beforeEach(() => jest.clearAllMocks())

  test('redirects to /game/setup when no game config', () => {
    render(<GameProvider><GamePlayPage /></GameProvider>)
    expect(mockReplace).toHaveBeenCalledWith('/game/setup')
  })

  test('shows player name on Pass screen', () => {
    renderPlay()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  test('advances to next player name after tapping card twice and Done', async () => {
    renderPlay()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    await userEvent.click(screen.getByRole('button', { name: /^done$/i }))
    expect(screen.getByRole('button', { name: /bob/i })).toBeInTheDocument()
  })

  test('cycles through all player names and reaches discussion', async () => {
    renderPlay(3, [2], {}, ['Ana', 'Ben', 'Cal'], 1)
    for (const playerName of ['Ana', 'Ben', 'Cal']) {
      const card = screen.getByRole('button', { name: new RegExp(playerName, 'i') })
      await userEvent.click(card)
      await userEvent.click(card)
      await userEvent.click(screen.getByRole('button', { name: /^done$/i }))
    }
    await userEvent.click(screen.getByRole('button', { name: /start discussion/i }))
    expect(screen.getByRole('button', { name: /reveal imposter/i })).toBeInTheDocument()
  })

  test('non-imposter player sees the word on reveal', async () => {
    renderPlay(4, [2]) // Alice (index 0) is NOT imposter
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  test('imposter player sees IMPOSTER on reveal', async () => {
    renderPlay(4, [0]) // Alice (index 0) IS imposter
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    expect(screen.getByText('IMPOSTER')).toBeInTheDocument()
  })

  test('discussion phase shows Reveal Imposter button', () => {
    renderPlay(4, [2], { phase: 'discussion', allRevealed: true })
    expect(screen.getByRole('button', { name: /reveal imposter/i })).toBeInTheDocument()
  })

  test('timer can be enabled and disabled in discussion phase', async () => {
    renderPlay(4, [2], { phase: 'discussion', allRevealed: true })
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /enable timer/i }))
    expect(screen.getByRole('timer')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /disable timer/i }))
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  test('results shows imposter name', () => {
    renderPlay(4, [2], { phase: 'results' })
    // Carol is at index 2
    expect(screen.getAllByText(/carol/i).length).toBeGreaterThan(0)
  })

  test('Play Again navigates to /game/setup?resume=1', async () => {
    renderPlay(4, [2], { phase: 'results' })
    await userEvent.click(screen.getByRole('button', { name: /play again/i }))
    expect(mockPush).toHaveBeenCalledWith('/game/setup?resume=1')
  })

  test('Home link is present', () => {
    renderPlay()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/game/setup')
  })

  test('results page has Home link', () => {
    renderPlay(4, [2], { phase: 'results' })
    const homeLinks = screen.getAllByRole('link', { name: /home/i })
    expect(homeLinks.length).toBeGreaterThan(0)
    homeLinks.forEach(l => expect(l).toHaveAttribute('href', '/game/setup'))
  })

  test('multiple imposters shown in results', () => {
    renderPlay(6, [1, 3], {
      phase: 'results',
    }, ['Ana', 'Ben', 'Cal', 'Dan', 'Eve', 'Fay'], 2)
    expect(screen.getByText(/the imposters/i)).toBeInTheDocument()
    expect(screen.getByText(/ben/i)).toBeInTheDocument()
    expect(screen.getByText(/dan/i)).toBeInTheDocument()
  })
})
