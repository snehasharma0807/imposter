/** @jest-environment node */
/// <reference types="@jest/globals" />
import { NextRequest } from 'next/server'
import {
  GET as getSharedCollection,
  POST as saveSharedCollection,
} from '../app/api/collections/share/[share_code]/route'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn().mockReturnValue(undefined) }),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const mockCreateServerClient = require('@supabase/ssr').createServerClient

// Helper to build a chainable eq mock that supports any number of .eq() calls
function makeSelectChain(resolvedValue: unknown) {
  const chain: Record<string, jest.Mock> = {}
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(resolvedValue)
  return chain
}

describe('Share Code API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/collections/share/[share_code]', () => {
    test('returns collection and words without authentication', async () => {
      const mockCollection = {
        id: 'col123',
        name: 'Shared Collection',
        share_code: 'ABC12345',
        created_at: '2023-01-01T00:00:00Z',
        words: [
          { id: 'w1', word: 'hello', created_at: '2023-01-01T00:00:00Z' },
          { id: 'w2', word: 'world', created_at: '2023-01-01T00:00:00Z' },
        ],
      }

      const selectChain = makeSelectChain({ data: mockCollection, error: null })
      const mockSupabase = {
        from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) }),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest(
        'http://localhost/api/collections/share/ABC12345'
      )
      const response = await getSharedCollection(request, {
        params: { share_code: 'ABC12345' },
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('col123')
      expect(data.name).toBe('Shared Collection')
      expect(data.share_code).toBe('ABC12345')
      expect(data.words).toHaveLength(2)
      // No auth call should be made
      expect(mockSupabase).not.toHaveProperty('auth')
    })

    test('returns 404 for an invalid share code', async () => {
      const selectChain = makeSelectChain({
        data: null,
        error: { message: 'No rows found' },
      })
      const mockSupabase = {
        from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(selectChain) }),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest(
        'http://localhost/api/collections/share/INVALID'
      )
      const response = await getSharedCollection(request, {
        params: { share_code: 'INVALID' },
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Collection not found')
    })
  })

  describe('POST /api/collections/share/[share_code] (save to account)', () => {
    test('clones the shared collection under the logged-in user', async () => {
      const sourceCollection = {
        id: 'src123',
        name: 'Original Collection',
        words: [
          { id: 'w1', word: 'apple' },
          { id: 'w2', word: 'banana' },
        ],
      }

      const newCollection = {
        id: 'new456',
        user_id: 'user999',
        name: 'Original Collection',
        share_code: 'NEW00001',
        created_at: '2023-06-01T00:00:00Z',
      }

      // fetch source: from('collections').select(...).eq('share_code', ...).single()
      const sourceChain = makeSelectChain({ data: sourceCollection, error: null })

      // insert new collection: from('collections').insert(...).select().single()
      const insertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: newCollection, error: null }),
        }),
      }

      // insert words: from('words').insert(...)
      const wordsInsertResult = { error: null }
      const wordsChain = {
        insert: jest.fn().mockResolvedValue(wordsInsertResult),
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user999' } },
            error: null,
          }),
        },
        from: jest.fn()
          .mockReturnValueOnce({ select: jest.fn().mockReturnValue(sourceChain) })
          .mockReturnValueOnce({ insert: jest.fn().mockReturnValue(insertChain) })
          .mockReturnValueOnce(wordsChain),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest(
        'http://localhost/api/collections/share/ABC12345',
        { method: 'POST' }
      )
      const response = await saveSharedCollection(request, {
        params: { share_code: 'ABC12345' },
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new456')
      expect(data.user_id).toBe('user999')
      expect(data.name).toBe('Original Collection')

      // Verify words were copied
      const wordsFrom = mockSupabase.from.mock.calls[2][0]
      expect(wordsFrom).toBe('words')
      const insertedWords = wordsChain.insert.mock.calls[0][0]
      expect(insertedWords).toHaveLength(2)
      expect(insertedWords[0]).toMatchObject({ collection_id: 'new456', word: 'apple' })
      expect(insertedWords[1]).toMatchObject({ collection_id: 'new456', word: 'banana' })
    })

    test('returns 401 when user is not logged in', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest(
        'http://localhost/api/collections/share/ABC12345',
        { method: 'POST' }
      )
      const response = await saveSharedCollection(request, {
        params: { share_code: 'ABC12345' },
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('returns 404 when share code does not exist during save', async () => {
      const sourceChain = makeSelectChain({
        data: null,
        error: { message: 'No rows found' },
      })

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user999' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(sourceChain) }),
      }
      mockCreateServerClient.mockReturnValue(mockSupabase)

      const request = new NextRequest(
        'http://localhost/api/collections/share/INVALID',
        { method: 'POST' }
      )
      const response = await saveSharedCollection(request, {
        params: { share_code: 'INVALID' },
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Collection not found')
    })
  })
})
