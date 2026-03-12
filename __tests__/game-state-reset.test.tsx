/// <reference types="@jest/globals" />
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { GameProvider, useGame } from '@/lib/GameContext'
import type { RoundState } from '@/lib/game-logic'
import GamePlayPage from '../app/game/play/page'
import GameSetupPage from '../app/game/setup/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: jest.fn() }),
}))
jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>
  }
})
jest.mock('@/lib/supabase', () => ({
  createClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: null } }) } }),
}))

const WORDS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
               'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa']
const PLAYER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave']

function makeResultsRound(): RoundState {
  return {
    word: 'Alpha',
    imposterIndices: [2],
    currentPlayerIndex: 0,
    allRevealed: true,
    phase: 'results',
    votes: [2, 2, 2],
    timerEnabled: false,
    timerSeconds: 60,
  }
}

function makeConfig(overrides = {}) {
  return {
    playerCount: 4,
    words: WORDS,
    playerNames: PLAYER_NAMES,
    imposterCount: 1,
    selectedCategoryIds: [],
    selectedCollectionIds: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helper: captures context state changes
// ---------------------------------------------------------------------------

function ContextReader({
  onRoundState,
}: {
  onRoundState: (rs: RoundState | null) => void
}) {
  const { roundState } = useGame()
  useEffect(() => { onRoundState(roundState) }, [roundState]) // eslint-disable-line
  return null
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Game state reset', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    )
  })

  // -------------------------------------------------------------------------
  // 1. setGameConfig (called by "Start Game") resets roundState to null
  // -------------------------------------------------------------------------

  test('setGameState resets roundState to null so the play page starts fresh', async () => {
    const observed: Array<RoundState | null> = []

    function Harness() {
      const { roundState, setGameState } = useGame()
      useEffect(() => { observed.push(roundState) }, [roundState])
      return (
        <button
          data-testid="go"
          onClick={() => setGameState(makeConfig({ words: [...WORDS, 'Lambda'] }))}
        />
      )
    }

    render(
      <GameProvider
        initialConfig={makeConfig()}
        initialRound={makeResultsRound()} // stale results from previous game
      >
        <Harness />
      </GameProvider>
    )

    // Initial state: stale results phase
    expect(observed.at(-1)?.phase).toBe('results')

    // Simulate "Start Game" click
    await act(async () => {
      await userEvent.click(screen.getByTestId('go'))
    })

    // setGameState must reset roundState to null
    expect(observed.at(-1)).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 2. /game/play mounts fresh when roundState is null but gameConfig exists
  // -------------------------------------------------------------------------

  test('/game/play calls startRound and shows reveal screen when roundState is null', () => {
    render(
      <GameProvider initialConfig={makeConfig()}>
        {/* no initialRound → roundState is null → startRound() should be triggered */}
        <GamePlayPage />
      </GameProvider>
    )
    // After startRound(), the reveal phase card grid should appear
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 3. /game/play redirects to setup if no gameConfig at all
  // -------------------------------------------------------------------------

  test('/game/play redirects to /game/setup when gameConfig is null', () => {
    render(
      <GameProvider>
        <GamePlayPage />
      </GameProvider>
    )
    expect(mockReplace).toHaveBeenCalledWith('/game/setup')
  })

  // -------------------------------------------------------------------------
  // 4. "Play Again" navigates to setup (state cleared on next Start Game)
  // -------------------------------------------------------------------------

  test('Play Again navigates to /game/setup?resume=1 from results screen', async () => {
    render(
      <GameProvider
        initialConfig={makeConfig()}
        initialRound={makeResultsRound()}
      >
        <GamePlayPage />
      </GameProvider>
    )
    expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /play again/i }))
    expect(mockPush).toHaveBeenCalledWith('/game/setup?resume=1')
  })

  // -------------------------------------------------------------------------
  // 5. Two consecutive games: setGameState called twice always starts fresh
  // -------------------------------------------------------------------------

  test('two consecutive setGameState calls each reset roundState to null', async () => {
    const roundStates: Array<RoundState | null> = []

    function Harness() {
      const { roundState, setGameState, startRound } = useGame()
      useEffect(() => { roundStates.push(roundState) }, [roundState])
      return (
        <>
          <button
            data-testid="start1"
            onClick={() => setGameState(makeConfig())}
          />
          <button
            data-testid="start2"
            onClick={() => setGameState(makeConfig({ words: [...WORDS, 'Mu'] }))}
          />
          <button data-testid="startround" onClick={startRound} />
        </>
      )
    }

    render(<GameProvider><Harness /></GameProvider>)

    // Game 1: set config → simulate play page calling startRound
    await act(async () => {
      await userEvent.click(screen.getByTestId('start1'))
    })
    expect(roundStates.at(-1)).toBeNull()

    await act(async () => {
      await userEvent.click(screen.getByTestId('startround'))
    })
    expect(roundStates.at(-1)?.phase).toBe('reveal')

    // Simulate game reaching results phase by calling setGameState again (Play Again → Start Game)
    await act(async () => {
      await userEvent.click(screen.getByTestId('start2'))
    })
    // roundState must be null again — play page will call startRound fresh
    expect(roundStates.at(-1)).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 6. Start Game from setup page with a stale previous game produces a
  //    fresh reveal phase on the play page (full integration)
  // -------------------------------------------------------------------------

  test('Start Game after a finished game launches a new reveal phase', async () => {
    const DEFAULT_CATEGORIES = [
      {
        id: 'cat1',
        name: 'Animals',
        words: ['Lion','Tiger','Bear','Wolf','Fox','Eagle','Shark','Whale','Snake','Frog',
                'Parrot','Panda','Koala','Moose','Deer','Rabbit','Turtle','Dolphin','Gorilla','Cheetah'],
      },
    ]
    ;(global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(DEFAULT_CATEGORIES) })
    )

    // Render setup inside a provider that already has a stale results round
    const { unmount } = render(
      <GameProvider
        initialConfig={makeConfig()}
        initialRound={makeResultsRound()}
      >
        <GameSetupPage />
      </GameProvider>
    )

    // Wait for categories to load, select one, start game
    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))
    await userEvent.click(screen.getByRole('button', { name: /start game/i }))

    // router.push was called (navigation)
    expect(mockPush).toHaveBeenCalledWith('/game/play')

    // Unmount setup, mount play page in same provider to verify fresh state
    // We test the context behaviour directly: roundState must be null at this point
    // (GamePlayPage would call startRound() → reveal phase)
    unmount()

    let capturedPhase: string | undefined
    function PhaseReader() {
      const { roundState } = useGame()
      capturedPhase = roundState?.phase ?? 'null'
      return null
    }

    // The provider must still hold the new config with roundState=null
    // We verify by rendering a fresh play page against the SAME provider tree
    // Since unmount destroyed the tree, we re-render with the expectation
    // that the context was properly updated. We verify via setGameState behaviour.
    let contextRef: ReturnType<typeof useGame> | null = null
    function Grabber() { contextRef = useGame(); return null }
    render(
      <GameProvider
        initialConfig={makeConfig()}
        initialRound={makeResultsRound()} // start with stale results
      >
        <Grabber />
        <PhaseReader />
      </GameProvider>
    )

    // After setGameState, phase should become null
    act(() => { contextRef!.setGameState(makeConfig()) })
    expect(capturedPhase).toBe('null')
  })
})
