/// <reference types="@jest/globals" />
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider } from '@/lib/GameContext'
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
  // 3. Share code fetches and adds words
  // -------------------------------------------------------------------------

  test('entering a valid share code loads and adds its words', async () => {
    const shareResponse = {
      id: 'col123',
      name: 'Friend Collection',
      words: [
        { id: 'w1', word: 'Sword' },
        { id: 'w2', word: 'Shield' },
        { id: 'w3', word: 'Axe' },
      ],
    }

    ;(global as any).fetch = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementationOnce(() => makeOkResponse(shareResponse))

    renderSetup()
    await screen.findByText('Animals')

    await userEvent.type(screen.getByLabelText('Share code'), 'ABC12345')
    await userEvent.click(screen.getByRole('button', { name: /^load$/i }))

    expect(await screen.findByText('3 words loaded from share codes.')).toBeInTheDocument()
    expect(screen.getByText('3 words selected')).toBeInTheDocument()
  })

  test('entering an invalid share code shows an error', async () => {
    ;(global as any).fetch = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementationOnce(() => makeErrorResponse())

    renderSetup()
    await screen.findByText('Animals')

    await userEvent.type(screen.getByLabelText('Share code'), 'BADCODE')
    await userEvent.click(screen.getByRole('button', { name: /^load$/i }))

    expect(
      await screen.findByText('Collection not found for that share code.')
    ).toBeInTheDocument()
  })

  test('share code is uppercased automatically and cleared after loading', async () => {
    const shareResponse = { id: 'col123', name: 'X', words: [{ id: 'w1', word: 'Gem' }] }

    ;(global as any).fetch = jest.fn()
      .mockImplementationOnce(() => makeOkResponse(DEFAULT_CATEGORIES))
      .mockImplementationOnce(() => makeOkResponse(shareResponse))

    renderSetup()
    await screen.findByText('Animals')

    const shareInput = screen.getByLabelText('Share code') as HTMLInputElement
    await userEvent.type(shareInput, 'abc12345')
    // Input value should be uppercased
    expect(shareInput.value).toBe('ABC12345')

    await userEvent.click(screen.getByRole('button', { name: /^load$/i }))
    await screen.findByText('1 words loaded from share codes.')
    // Input clears after successful load
    expect(shareInput.value).toBe('')
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

    renderSetup()

    expect(await screen.findByText('Your Collections')).toBeInTheDocument()
    expect(screen.getByText('My Sci-Fi Words')).toBeInTheDocument()
    expect(screen.getByText('Office Words')).toBeInTheDocument()
  })

  test('does not show user collections section when logged out', async () => {
    renderSetup()
    await screen.findByText('Animals')

    expect(screen.queryByText('Your Collections')).not.toBeInTheDocument()
  })
})
