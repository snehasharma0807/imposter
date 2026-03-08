/// <reference types="@jest/globals" />
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider } from '@/lib/GameContext'
import type { RoundState } from '@/lib/game-logic'
import GamePlayPage from '../app/game/play/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORDS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']
const PLAYER_COUNT = 4

function renderPlay(
  playerCount = PLAYER_COUNT,
  imposterIndex = 2,
  roundOverrides: Partial<RoundState> = {}
) {
  const initialRound: RoundState = {
    word: 'Alpha',
    imposterIndex,
    currentPlayerIndex: 0,
    allRevealed: false,
    phase: 'reveal',
    votes: [],
    timerEnabled: false,
    timerSeconds: 60,
    ...roundOverrides,
  }
  const initialConfig = { playerCount, words: WORDS }

  return render(
    <GameProvider initialConfig={initialConfig} initialRound={initialRound}>
      <GamePlayPage />
    </GameProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Game Play Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── 1. Redirect when no config ────────────────────────────────────────────

  test('redirects to /game/setup when no game config', () => {
    render(
      <GameProvider>
        <GamePlayPage />
      </GameProvider>
    )
    expect(mockReplace).toHaveBeenCalledWith('/game/setup')
  })

  // ── 2. Reveal phase — player order ────────────────────────────────────────

  test('shows Pass to Player 1 first', () => {
    renderPlay()
    expect(screen.getByText(/pass to player 1/i)).toBeInTheDocument()
  })

  test('advances to next player after Reveal then Next Player', async () => {
    renderPlay()
    await userEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
    await userEvent.click(screen.getByRole('button', { name: /next player/i }))
    expect(screen.getByText(/pass to player 2/i)).toBeInTheDocument()
  })

  test('cycles through all players in order', async () => {
    renderPlay(3, 2) // 3 players, imposter is player 3
    for (let i = 1; i <= 3; i++) {
      expect(screen.getByText(new RegExp(`pass to player ${i}`, 'i'))).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
      if (i < 3) {
        await userEvent.click(screen.getByRole('button', { name: /next player/i }))
      } else {
        // Last player button says "Start Discussion"
        await userEvent.click(screen.getByRole('button', { name: /start discussion/i }))
      }
    }
    // Now in discussion phase — Vote button visible
    expect(screen.getByRole('button', { name: /^vote$/i })).toBeInTheDocument()
  })

  // ── 3. Non-imposter sees word, imposter sees IMPOSTER ─────────────────────

  test('non-imposter player sees the word on reveal', async () => {
    renderPlay(4, 2) // player 1 (index 0) is NOT the imposter
    await userEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  test('imposter player sees IMPOSTER on reveal', async () => {
    renderPlay(4, 0) // player 1 (index 0) IS the imposter
    await userEvent.click(screen.getByRole('button', { name: /^reveal$/i }))
    expect(screen.getByText('IMPOSTER')).toBeInTheDocument()
  })

  // ── 4. Discussion phase ───────────────────────────────────────────────────

  test('discussion phase shows Vote button', () => {
    renderPlay(4, 2, { phase: 'discussion', allRevealed: true })
    expect(screen.getByRole('button', { name: /^vote$/i })).toBeInTheDocument()
  })

  test('timer can be enabled and disabled in discussion phase', async () => {
    renderPlay(4, 2, { phase: 'discussion', allRevealed: true })
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /enable timer/i }))
    expect(screen.getByRole('timer')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /disable timer/i }))
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  // ── 5. Voting phase ───────────────────────────────────────────────────────

  test('voting phase shows one button per player', () => {
    renderPlay(4, 2, { phase: 'voting' })
    const buttons = screen.getAllByRole('button', { name: /player \d/i })
    expect(buttons).toHaveLength(4)
  })

  test('See Results button appears only after all votes are cast', async () => {
    renderPlay(4, 2, { phase: 'voting' })
    expect(screen.queryByRole('button', { name: /see results/i })).not.toBeInTheDocument()

    for (let i = 0; i < 4; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: /player \d/i })[0])
    }
    expect(screen.getByRole('button', { name: /see results/i })).toBeInTheDocument()
  })

  test('votes tally correctly — most-voted player shown in results', async () => {
    renderPlay(4, 1, { phase: 'voting' })

    const playerButtons = screen.getAllByRole('button', { name: /player \d/i })
    await userEvent.click(playerButtons[1]) // Player 2
    await userEvent.click(playerButtons[1]) // Player 2
    await userEvent.click(playerButtons[1]) // Player 2
    await userEvent.click(playerButtons[0]) // Player 1 (4th vote)

    await userEvent.click(screen.getByRole('button', { name: /see results/i }))

    expect(screen.getByText((_, el) =>
      el?.tagName === 'P' && /most voted/i.test(el.textContent ?? '') && /player 2/i.test(el.textContent ?? '')
    )).toBeInTheDocument()
  })

  // ── 6. Results phase ─────────────────────────────────────────────────────

  test('shows Imposter Caught when imposter gets most votes', () => {
    renderPlay(4, 1, {
      phase: 'results',
      votes: [1, 1, 1, 0],
    })
    expect(screen.getByText(/imposter caught/i)).toBeInTheDocument()
  })

  test('shows Imposter Escaped when imposter does not get most votes', () => {
    renderPlay(4, 2, {
      phase: 'results',
      votes: [0, 0, 1, 0],
    })
    expect(screen.getByText(/imposter escaped/i)).toBeInTheDocument()
  })

  test('reveals imposter player number in results', () => {
    renderPlay(4, 2, {
      phase: 'results',
      votes: [2, 2, 2, 2],
    })
    expect(screen.getAllByText(/player 3/i).length).toBeGreaterThan(0)
  })

  test('Play Again button resets to reveal phase', async () => {
    renderPlay(4, 2, { phase: 'results', votes: [2, 2, 2, 2] })
    await userEvent.click(screen.getByRole('button', { name: /play again/i }))
    expect(screen.getByText(/pass to player 1/i)).toBeInTheDocument()
  })
})
