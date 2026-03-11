import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '../app/auth/signup/page'
import LoginPage from '../app/auth/login/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  }),
}))

describe('Auth Pages', () => {
  test('Signup form renders correctly', () => {
    render(<SignupPage />)

    expect(screen.getByText(/create your free account/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  test('Login form renders correctly', () => {
    render(<LoginPage />)

    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/no account/i)).toBeInTheDocument()
  })
})