/// <reference types="@jest/globals" />
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { GameProvider, useGame } from '@/lib/GameContext'
import GameSetupPage from '../app/game/setup/page'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn() }),
}))

// Mutable so individual tests can control auth state.
// Using a function reference (not an arrow fn) so jest.mock hoisting works.
let mockUserImpl: () => Promise<{ data: { user: null | { id: string } } }> =
  () => Promise.resolve({ data: { user: null } })

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getUser: () => mockUserImpl() },
  }),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ANIMALS_WORDS = [
  'Lion', 'Tiger', 'Bear', 'Wolf', 'Fox',
  'Eagle', 'Shark', 'Whale', 'Snake', 'Frog',
  'Parrot', 'Panda', 'Koala', 'Moose', 'Deer',
  'Rabbit', 'Turtle', 'Dolphin', 'Gorilla', 'Cheetah',
]

const FOOD_WORDS = [
  'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Curry',
  'Ramen', 'Burger', 'Steak', 'Salad', 'Soup',
  'Rice', 'Bread', 'Cheese', 'Eggs', 'Fish',
  'Chicken', 'Tofu', 'Noodles', 'Wrap', 'Sandwich',
]

const DEFAULT_CATEGORIES = [
  { id: 'cat1', name: 'Animals', words: ANIMALS_WORDS },
  { id: 'cat2', name: 'Food', words: FOOD_WORDS },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSetup() {
  return render(
    <GameProvider>
      <GameSetupPage />
    </GameProvider>
  )
}

function makeOkResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function makeErrorResponse() {
  return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Game Setup Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockReset()
    mockUserImpl = () => Promise.resolve({ data: { user: null } })
    ;(global as any).fetch = jest.fn(() => makeOkResponse(DEFAULT_CATEGORIES))
  })

  // -------------------------------------------------------------------------
  // 1. Renders default categories
  // -------------------------------------------------------------------------

  test('renders default categories fetched from the API', async () => {
    renderSetup()

    // Categories appear as labelled checkboxes once loading completes
    expect(await screen.findByText('Animals')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(DEFAULT_CATEGORIES.length)
  })

  test('shows word count for each default category', async () => {
    renderSetup()
    await screen.findByText('Animals')

    // Both categories have the same word count so use getAllByText
    const counts = screen.getAllByText(`(${ANIMALS_WORDS.length} words)`)
    expect(counts).toHaveLength(DEFAULT_CATEGORIES.length)
  })

  // -------------------------------------------------------------------------
  // 2. Selecting categories updates state
  // -------------------------------------------------------------------------

  test('checking a category marks the checkbox and increases word count', async () => {
    renderSetup()

    const checkbox = await screen.findByRole('checkbox', { name: /animals/i })
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText('0 words selected')).toBeInTheDocument()

    await userEvent.click(checkbox)

    expect(checkbox).toBeChecked()
    expect(screen.getByText(`${ANIMALS_WORDS.length} words selected`)).toBeInTheDocument()
  })

  test('unchecking a category removes words from the count', async () => {
    renderSetup()

    const checkbox = await screen.findByRole('checkbox', { name: /animals/i })
    await userEvent.click(checkbox)
    expect(screen.getByText(`${ANIMALS_WORDS.length} words selected`)).toBeInTheDocument()

    await userEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText('0 words selected')).toBeInTheDocument()
  })

  test('selecting multiple categories accumulates their words', async () => {
    renderSetup()

    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /food/i }))

    const total = ANIMALS_WORDS.length + FOOD_WORDS.length
    expect(screen.getByText(`${total} words selected`)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 4. Start Game disabled conditions
  // -------------------------------------------------------------------------

  test('Start Game is disabled when no words are selected', async () => {
    renderSetup()
    await screen.findByText('Animals')

    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled()
  })

  test('Start Game is disabled when player count is below 3', async () => {
    renderSetup()

    // Select a category so words > 0
    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))

    // Drop player count below minimum via fireEvent (more reliable for number inputs)
    const playerInput = screen.getByLabelText('Number of players') as HTMLInputElement
    fireEvent.change(playerInput, { target: { value: '2' } })

    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled()
    expect(await screen.findByRole('alert')).toHaveTextContent('At least 3 players required.')
  })

  test('Start Game is enabled when player count ≥ 3 and words are selected', async () => {
    renderSetup()
    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))

    expect(screen.getByRole('button', { name: /start game/i })).not.toBeDisabled()
  })

  test('Start Game navigates to /game/play', async () => {
    renderSetup()
    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))
    await userEvent.click(screen.getByRole('button', { name: /start game/i }))

    expect(mockPush).toHaveBeenCalledWith('/game/play')
  })

  // -------------------------------------------------------------------------
  // 5. Logged-in user sees their collections
  // -------------------------------------------------------------------------

  test('shows saved user collections when authenticated', async () => {
    mockUserImpl = () =>
      Promise.resolve({ data: { user: { id: 'user123' } } })

    const userCollections = [
      { id: 'ucol1', name: 'My Sci-Fi Words', share_code: 'XYZ11111' },
      { id: 'ucol2', name: 'Office Words', share_code: 'XYZ22222' },
    ]

    ;(global as any).fetch = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementationOnce(() => makeOkResponse(userCollections))
      .mockImplementationOnce(() => makeOkResponse({ saved_players: null })) // /api/profile

    renderSetup()

    expect(await screen.findByText('Custom Categories')).toBeInTheDocument()
    expect(screen.getByText('My Sci-Fi Words')).toBeInTheDocument()
    expect(screen.getByText('Office Words')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 6. Player name placeholder behaviour
  // -------------------------------------------------------------------------

  test('player name inputs have placeholder text and are not pre-filled', async () => {
    renderSetup()
    await screen.findByText('Animals')

    const input1 = screen.getByLabelText('Name for player 1') as HTMLInputElement
    const input4 = screen.getByLabelText('Name for player 4') as HTMLInputElement

    expect(input1).toHaveAttribute('placeholder', 'Player 1')
    expect(input4).toHaveAttribute('placeholder', 'Player 4')
    expect(input1.value).toBe('')
    expect(input4.value).toBe('')
  })

  test('player name input value is empty string on render (placeholder is not a pre-filled value)', async () => {
    renderSetup()
    await screen.findByText('Animals')

    const inputs = screen.getAllByRole('textbox').filter(
      el => el.getAttribute('aria-label')?.startsWith('Name for player')
    ) as HTMLInputElement[]

    expect(inputs.length).toBeGreaterThan(0)
    inputs.forEach(input => expect(input.value).toBe(''))
  })

  test('empty player name falls back to "Player N" display name when game starts', async () => {
    let capturedNames: string[] | null = null

    function StateCapture() {
      const { gameConfig } = useGame()
      useEffect(() => {
        if (gameConfig?.playerNames) capturedNames = gameConfig.playerNames
      }, [gameConfig])
      return null
    }

    render(
      <GameProvider>
        <GameSetupPage />
        <StateCapture />
      </GameProvider>
    )

    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))
    await userEvent.type(screen.getByLabelText('Name for player 1'), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /start game/i }))

    await waitFor(() =>
      expect(capturedNames).toEqual(['Alice', 'Player 2', 'Player 3', 'Player 4'])
    )
  })

  test('does not show create button or collections list when logged out', async () => {
    renderSetup()
    await screen.findByText('Animals')

    expect(screen.queryByRole('link', { name: /create new/i })).not.toBeInTheDocument()
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 7. Play Again / Resume mode
  // -------------------------------------------------------------------------

  test('resume mode pre-populates player names and count from previous game config', async () => {
    window.history.pushState({}, '', '/game/setup?resume=1')

    const prevConfig = {
      playerCount: 3,
      playerNames: ['Alice', 'Bob', 'Carol'],
      imposterCount: 1,
      words: ['Word1'],
      selectedCategoryIds: [],
      selectedCollectionIds: [],
    }

    render(
      <GameProvider initialConfig={prevConfig}>
        <GameSetupPage />
      </GameProvider>
    )

    await screen.findByText('Animals')

    const input1 = screen.getByLabelText('Name for player 1') as HTMLInputElement
    const input3 = screen.getByLabelText('Name for player 3') as HTMLInputElement
    expect(input1.value).toBe('Alice')
    expect(input3.value).toBe('Carol')

    const playerCountInput = screen.getByLabelText('Number of players') as HTMLInputElement
    expect(playerCountInput.value).toBe('3')

    window.history.pushState({}, '', '/game/setup')
  })

  test('resume mode shows Start Fresh link', async () => {
    window.history.pushState({}, '', '/game/setup?resume=1')

    const prevConfig = {
      playerCount: 3,
      playerNames: ['Alice', 'Bob', 'Carol'],
      imposterCount: 1,
      words: ['Word1'],
    }

    render(
      <GameProvider initialConfig={prevConfig}>
        <GameSetupPage />
      </GameProvider>
    )

    await screen.findByText('Animals')
    expect(screen.getByRole('link', { name: /start fresh/i })).toBeInTheDocument()

    window.history.pushState({}, '', '/game/setup')
  })

  // -------------------------------------------------------------------------
  // 8. Saved players (profile persistence)
  // -------------------------------------------------------------------------

  test('logged-in user sees Use last players button when profile has saved players', async () => {
    mockUserImpl = () =>
      Promise.resolve({ data: { user: { id: 'user123' } } })

    ;(global as any).fetch = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))     // /api/default-categories
      .mockImplementationOnce(() => makeOkResponse([]))                      // /api/collections
      .mockImplementationOnce(() => makeOkResponse({ saved_players: ['Alice', 'Bob', 'Carol'] })) // /api/profile

    renderSetup()
    await screen.findByText('Animals')

    expect(screen.getByRole('button', { name: /use last players/i })).toBeInTheDocument()
  })

  test('Use last players button restores saved player names', async () => {
    mockUserImpl = () =>
      Promise.resolve({ data: { user: { id: 'user123' } } })

    ;(global as any).fetch = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementationOnce(() => makeOkResponse([]))
      .mockImplementationOnce(() => makeOkResponse({ saved_players: ['Alice', 'Bob', 'Carol'] }))

    renderSetup()
    await screen.findByText('Animals')

    await userEvent.click(screen.getByRole('button', { name: /use last players/i }))

    const input1 = screen.getByLabelText('Name for player 1') as HTMLInputElement
    const input2 = screen.getByLabelText('Name for player 2') as HTMLInputElement
    const input3 = screen.getByLabelText('Name for player 3') as HTMLInputElement
    expect(input1.value).toBe('Alice')
    expect(input2.value).toBe('Bob')
    expect(input3.value).toBe('Carol')
  })

  test('player names are saved to profile on game start for logged-in users', async () => {
    mockUserImpl = () =>
      Promise.resolve({ data: { user: { id: 'user123' } } })

    const fetchMock = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementationOnce(() => makeOkResponse([]))
      .mockImplementationOnce(() => makeOkResponse({ saved_players: null }))
      .mockImplementation(() => makeOkResponse({ ok: true })) // catch-all for startGame calls
    ;(global as any).fetch = fetchMock

    renderSetup()
    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))
    await userEvent.type(screen.getByLabelText('Name for player 1'), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /start game/i }))

    const patchCall = fetchMock.mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/profile' && opts?.method === 'PATCH'
    )
    expect(patchCall).toBeDefined()
    const body = JSON.parse(patchCall![1].body as string)
    expect(body.saved_players[0]).toBe('Alice')
    expect(body.saved_players[1]).toBe('Player 2')
  })

  test('unauthenticated users do not trigger profile save on game start', async () => {
    // mockUserImpl already returns null user (set in beforeEach)
    const fetchMock = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementation(() => makeOkResponse({ ok: true }))
    ;(global as any).fetch = fetchMock

    renderSetup()
    await userEvent.click(await screen.findByRole('checkbox', { name: /animals/i }))
    await userEvent.click(screen.getByRole('button', { name: /start game/i }))

    const patchCall = fetchMock.mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/profile' && opts?.method === 'PATCH'
    )
    expect(patchCall).toBeUndefined()
  })
})
