/// <reference types="@jest/globals" />
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider } from '@/lib/GameContext'

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useParams: () => ({ id: '1' }),
}))

jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>
  }
})

// ---------------------------------------------------------------------------
// Dashboard tests
// ---------------------------------------------------------------------------

describe('Dashboard — loading & error states', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('shows loading spinner while fetching collections', async () => {
    // fetch never resolves → stays in loading state
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock

    const { default: DashboardPage } = await import('../app/dashboard/page')
    render(<DashboardPage />)

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  test('shows error message when fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    ) as jest.Mock

    const { default: DashboardPage } = await import('../app/dashboard/page')
    render(<DashboardPage />)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i)
  })

  test('shows empty state when there are no collections', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ) as jest.Mock

    const { default: DashboardPage } = await import('../app/dashboard/page')
    render(<DashboardPage />)

    await waitFor(() =>
      expect(screen.getByText(/no lists yet/i)).toBeInTheDocument()
    )
    expect(screen.getByRole('link', { name: /create your first collection/i })).toBeInTheDocument()
  })

  test('renders collections list when fetch succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: '1', name: 'My Animals', share_code: 'ABC123', created_at: '2024-01-01', access_type: 'owner' },
          { id: '2', name: 'My Foods', share_code: 'DEF456', created_at: '2024-01-02', access_type: 'owner' },
        ]),
      })
    ) as jest.Mock

    const { default: DashboardPage } = await import('../app/dashboard/page')
    render(<DashboardPage />)

    await waitFor(() => expect(screen.getByText('My Animals')).toBeInTheDocument())
    expect(screen.getByText('My Foods')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Game Setup — loading & error states
// ---------------------------------------------------------------------------

let mockGetUser: () => Promise<{ data: { user: unknown } }> = () =>
  Promise.resolve({ data: { user: null } })

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({ auth: { getUser: () => mockGetUser() } }),
}))

describe('Game Setup — loading & error states', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockGetUser = () => Promise.resolve({ data: { user: null } })
  })

  test('shows loading spinner while fetching categories', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock

    const { default: GameSetupPage } = await import('../app/game/setup/page')
    render(
      <GameProvider>
        <GameSetupPage />
      </GameProvider>
    )

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  test('shows error message when default categories fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    ) as jest.Mock

    const { default: GameSetupPage } = await import('../app/game/setup/page')
    render(
      <GameProvider>
        <GameSetupPage />
      </GameProvider>
    )

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load categories/i)
  })

})
