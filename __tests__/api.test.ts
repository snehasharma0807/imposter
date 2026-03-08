/** @jest-environment node */
/// <reference types="@jest/globals" />
import { NextRequest } from 'next/server'
import { GET as getCollections, POST as createCollection } from '../app/api/collections/route'
import { GET as getCollection, PATCH as updateCollection, DELETE as deleteCollection } from '../app/api/collections/[id]/route'
import { POST as addWord } from '../app/api/collections/[id]/words/route'
import { DELETE as deleteWord } from '../app/api/words/[id]/route'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn().mockReturnValue(undefined) }),
}))

// Mock createServerClient
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const mockCreateServerClient = require('@supabase/ssr').createServerClient

function makeEqChain(resolvedValue: unknown) {
  const eqFn = jest.fn()
  const singleFn = jest.fn().mockResolvedValue(resolvedValue)
  const chain = { eq: eqFn, single: singleFn }
  eqFn.mockReturnValue(chain)
  return chain
}

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Collections', () => {
    test('Creating a collection returns 201 with correct shape', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } }),
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'col123',
                  user_id: 'user123',
                  name: 'Test Collection',
                  share_code: 'ABC12345',
                  created_at: '2023-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost/api/collections', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Collection' }),
      })

      const response = await createCollection(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({
        id: 'col123',
        user_id: 'user123',
        name: 'Test Collection',
        share_code: 'ABC12345',
        created_at: '2023-01-01T00:00:00Z',
      })
    })

    test('Unauthenticated requests to create collection return 401', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost/api/collections', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Collection' }),
      })

      const response = await createCollection(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Words', () => {
    test('Adding a word to a collection persists correctly', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } }),
        },
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue(
              makeEqChain({ data: { id: 'col123' }, error: null })
            ),
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'word123',
                    collection_id: 'col123',
                    word: 'testword',
                    created_at: '2023-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost/api/collections/col123/words', {
        method: 'POST',
        body: JSON.stringify({ word: 'testword' }),
      })

      const response = await addWord(request, { params: { id: 'col123' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({
        id: 'word123',
        collection_id: 'col123',
        word: 'testword',
        created_at: '2023-01-01T00:00:00Z',
      })
    })

    test('Deleting a word removes it', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123' } } }),
        },
        from: jest.fn()
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue(
              makeEqChain({ data: { collection_id: 'col123' }, error: null })
            ),
          })
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue(
              makeEqChain({ data: { id: 'col123' }, error: null })
            ),
          })
          .mockReturnValueOnce({
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost/api/words/word123', {
        method: 'DELETE',
      })

      const response = await deleteWord(request, { params: { id: 'word123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('Unauthenticated requests to add word return 401', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest('http://localhost/api/collections/col123/words', {
        method: 'POST',
        body: JSON.stringify({ word: 'testword' }),
      })

      const response = await addWord(request, { params: { id: 'col123' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})