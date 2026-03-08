/** @jest-environment node */
/// <reference types="@jest/globals" />
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Mock createServerClient
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}))

const mockCreateServerClient = require('@supabase/ssr').createServerClient

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('redirects unauthenticated requests to /login for protected routes', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const request = new NextRequest(new URL('http://localhost/dashboard'))
    const response = await middleware(request)

    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('location')).toBe('http://localhost/auth/login')
  })

  test('allows authenticated requests through for protected routes', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: '123' } } }),
      },
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const request = new NextRequest(new URL('http://localhost/dashboard'))
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })

  test('redirects authenticated users away from /auth pages', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: '123' } } }),
      },
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const request = new NextRequest(new URL('http://localhost/auth/login'))
    const response = await middleware(request)

    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
  })
})