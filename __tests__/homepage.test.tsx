/// <reference types="@jest/globals" />
import { render, screen } from '@testing-library/react'
import HomePage from '../app/page'

jest.mock('next/link', () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({ auth: { getUser: () => Promise.resolve({ data: { user: null } }) } }),
}))

describe('Homepage', () => {
  beforeEach(() => {
    render(<HomePage />)
  })

  test('renders the app name', () => {
    expect(screen.getByRole('heading', { name: /imposter/i })).toBeInTheDocument()
  })

  test('renders a tagline / description', () => {
    expect(screen.getByText(/find the imposter/i)).toBeInTheDocument()
  })

  test('renders a Play Now link pointing to /game/setup', () => {
    const link = screen.getByRole('link', { name: /play now/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/game/setup')
  })

  test('renders a Create Account / Sign Up CTA pointing to /auth/signup', () => {
    const link = screen.getByRole('link', { name: /create account/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/auth/signup')
  })

  test('renders a Sign in link pointing to /auth/login', () => {
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/auth/login')
  })
})
