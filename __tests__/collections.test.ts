/** @jest-environment node */
/// <reference types="@jest/globals" />
import { NextRequest } from 'next/server'
import { POST as createCollection } from '../app/api/collections/route'
import { POST as addWord } from '../app/api/collections/[id]/words/route'
import { POST as generateShare, DELETE as revokeShare } from '../app/api/collections/[id]/share/route'
import { GET as previewImport, POST as doImport } from '../app/api/collections/import/[share_code]/route'
import { POST as copyCollection } from '../app/api/collections/[id]/copy/route'
import { DELETE as deleteWord } from '../app/api/words/[id]/route'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn().mockReturnValue(undefined) }),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const mockCreateServerClient = require('@supabase/ssr').createServerClient

// Builds a chainable Supabase query mock that handles .eq(), .is(), .in(), .single(), etc.
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, jest.Mock> = {}
  ;['eq', 'is', 'not', 'in', 'order', 'limit', 'neq'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.single = jest.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
  return chain
}

describe('Collections — create with words', () => {
  beforeEach(() => jest.clearAllMocks())

  test('Creating a collection with typed words saves correctly', async () => {
    const newCollection = { id: 'col1', user_id: 'u1', name: 'Animals', share_code: 'AAAA1111' }
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: newCollection, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Animals', words: ['Lion', 'Tiger', 'Bear'] }),
    })
    const res = await createCollection(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.name).toBe('Animals')

    // Verify words were inserted
    const wordsFrom = mockSupabase.from.mock.calls[1][0]
    expect(wordsFrom).toBe('words')
    const insertedWords = mockSupabase.from.mock.results[1].value.insert.mock.calls[0][0]
    expect(insertedWords).toHaveLength(3)
    expect(insertedWords[0]).toMatchObject({ collection_id: 'col1', word: 'Lion' })
  })

  test('Creating a collection with CSV-parsed words array saves correctly', async () => {
    const newCollection = { id: 'col2', user_id: 'u1', name: 'Foods', share_code: 'BBBB2222' }
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: newCollection, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    // Simulate words parsed from CSV: "Apple, Banana, Cherry\nDate"
    const parsedWords = ['Apple', 'Banana', 'Cherry', 'Date']
    const req = new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Foods', words: parsedWords }),
    })
    const res = await createCollection(req)

    expect(res.status).toBe(201)
    const insertedWords = mockSupabase.from.mock.results[1].value.insert.mock.calls[0][0]
    expect(insertedWords).toHaveLength(4)
    expect(insertedWords[2]).toMatchObject({ word: 'Cherry' })
  })

  test('Creating a collection without words returns 201 with no word insert', async () => {
    const newCollection = { id: 'col3', user_id: 'u1', name: 'Empty', share_code: 'CCCC3333' }
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: newCollection, error: null }),
          }),
        }),
      }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Empty' }),
    })
    const res = await createCollection(req)
    expect(res.status).toBe(201)
    // Only one from() call (collections insert), no words from() call
    expect(mockSupabase.from).toHaveBeenCalledTimes(1)
  })
})

describe('Share codes — generate and revoke', () => {
  beforeEach(() => jest.clearAllMocks())

  test('Owner can generate an edit-access share code', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner1' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: { id: 'col1' }, error: null })) }) // owner check
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: null, error: { message: 'not found' } })) }) // no existing code
        .mockReturnValueOnce({ insert: jest.fn().mockResolvedValue({ error: null }) }), // insert
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/col1/share', {
      method: 'POST',
      body: JSON.stringify({ access_type: 'edit' }),
    })
    const res = await generateShare(req, { params: { id: 'col1' } })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.access_type).toBe('edit')
    expect(data.share_code).toMatch(/^[A-F0-9]{8}$/)
  })

  test('Owner can generate a view-only share code', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner1' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: { id: 'col1' }, error: null })) })
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: null, error: { message: 'not found' } })) })
        .mockReturnValueOnce({ insert: jest.fn().mockResolvedValue({ error: null }) }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/col1/share', {
      method: 'POST',
      body: JSON.stringify({ access_type: 'view' }),
    })
    const res = await generateShare(req, { params: { id: 'col1' } })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.access_type).toBe('view')
  })

  test('Owner can revoke a share code', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner1' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: { id: 'col1' }, error: null })) }) // owner check
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/col1/share?type=edit', { method: 'DELETE' })
    const res = await revokeShare(req, { params: { id: 'col1' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  test('Non-owner cannot generate a share code (404)', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'other' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(makeChain({ data: null, error: { message: 'not found' } })),
      }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/col1/share', {
      method: 'POST',
      body: JSON.stringify({ access_type: 'edit' }),
    })
    const res = await generateShare(req, { params: { id: 'col1' } })
    expect(res.status).toBe(404)
  })
})

describe('Share code preview — public access', () => {
  beforeEach(() => jest.clearAllMocks())

  test('Share code preview is accessible without authentication', async () => {
    const mockSupabase = {
      from: jest.fn()
        .mockReturnValueOnce({ // collection_access lookup
          select: jest.fn().mockReturnValue(makeChain({ data: { collection_id: 'col1', access_type: 'view' }, error: null })),
        })
        .mockReturnValueOnce({ // collections lookup
          select: jest.fn().mockReturnValue(makeChain({ data: { id: 'col1', name: 'My List', created_at: '2024-01-01' }, error: null })),
        })
        .mockReturnValueOnce({ // words lookup
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [{ id: 'w1', word: 'Apple' }], error: null }),
            }),
          }),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/import/ABCD1234')
    const res = await previewImport(req, { params: { share_code: 'ABCD1234' } })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.name).toBe('My List')
    expect(data.access_type).toBe('view')
    expect(data.words).toHaveLength(1)
    // No auth.getUser call
    expect(mockSupabase).not.toHaveProperty('auth')
  })

  test('Preview returns 404 for unknown share code', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(makeChain({ data: null, error: { message: 'not found' } })),
      }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/import/INVALID1')
    const res = await previewImport(req, { params: { share_code: 'INVALID1' } })
    expect(res.status).toBe(404)
  })
})

describe('Import — edit-access user can modify words', () => {
  beforeEach(() => jest.clearAllMocks())

  test('Importing an edit-access code grants write access and allows adding words', async () => {
    // 1. Import the share code
    const importSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user2' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ // find share link
          select: jest.fn().mockReturnValue(makeChain({ data: { collection_id: 'col1', access_type: 'edit' }, error: null })),
        })
        .mockReturnValueOnce({ // check existing access
          select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })),
        })
        .mockReturnValueOnce({ // insert access row
          insert: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({ // fetch collection
          select: jest.fn().mockReturnValue(makeChain({ data: { id: 'col1', name: 'Shared List', created_at: '2024-01-01' }, error: null })),
        }),
    }
    mockCreateServerClient.mockReturnValue(importSupabase)

    const importReq = new NextRequest('http://localhost/api/collections/import/EDITCODE', { method: 'POST' })
    const importRes = await doImport(importReq, { params: { share_code: 'EDITCODE' } })
    const importData = await importRes.json()

    expect(importRes.status).toBe(201)
    expect(importData.access_type).toBe('edit')

    // 2. Edit-access user can add a word to the original collection
    jest.clearAllMocks()
    const wordSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user2' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ // owner check → not owner
          select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })),
        })
        .mockReturnValueOnce({ // edit access check → has edit access
          select: jest.fn().mockReturnValue(makeChain({ data: { access_type: 'edit' }, error: null })),
        })
        .mockReturnValueOnce({ // insert word
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'w99', collection_id: 'col1', word: 'Zebra' }, error: null }),
            }),
          }),
        }),
    }
    mockCreateServerClient.mockReturnValue(wordSupabase)

    const wordReq = new NextRequest('http://localhost/api/collections/col1/words', {
      method: 'POST',
      body: JSON.stringify({ word: 'Zebra' }),
    })
    const wordRes = await addWord(wordReq, { params: { id: 'col1' } })
    expect(wordRes.status).toBe(201)
  })
})

describe('Import — view-only user cannot modify words', () => {
  beforeEach(() => jest.clearAllMocks())

  test('View-only user gets 403 when trying to add a word', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'viewer' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ // owner check → not owner
          select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })),
        })
        .mockReturnValueOnce({ // access check → view only
          select: jest.fn().mockReturnValue(makeChain({ data: { access_type: 'view' }, error: null })),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/col1/words', {
      method: 'POST',
      body: JSON.stringify({ word: 'ShouldFail' }),
    })
    const res = await addWord(req, { params: { id: 'col1' } })
    expect(res.status).toBe(403)
  })

  test('View-only user gets 403 when trying to delete a word', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'viewer' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ // get word's collection_id
          select: jest.fn().mockReturnValue(makeChain({ data: { collection_id: 'col1' }, error: null })),
        })
        .mockReturnValueOnce({ // owner check → not owner
          select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })),
        })
        .mockReturnValueOnce({ // access check → view only
          select: jest.fn().mockReturnValue(makeChain({ data: { access_type: 'view' }, error: null })),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/words/w1', { method: 'DELETE' })
    const res = await deleteWord(req, { params: { id: 'w1' } })
    expect(res.status).toBe(403)
  })
})

describe('Copy view-only list', () => {
  beforeEach(() => jest.clearAllMocks())

  test('Copying a view-only list creates a new independent collection under the user', async () => {
    const newCollection = { id: 'newcol', user_id: 'viewer', name: 'My Copy', share_code: 'COPY1111' }
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'viewer' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ // owner check → not owner
          select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })),
        })
        .mockReturnValueOnce({ // access check → view
          select: jest.fn().mockReturnValue(makeChain({ data: { access_type: 'view' }, error: null })),
        })
        .mockReturnValueOnce({ // fetch source words
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [{ word: 'Apple' }, { word: 'Banana' }], error: null }),
          }),
        })
        .mockReturnValueOnce({ // create new collection
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: newCollection, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({ // copy words
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/originalcol/copy', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Copy' }),
    })
    const res = await copyCollection(req, { params: { id: 'originalcol' } })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.id).toBe('newcol')
    expect(data.user_id).toBe('viewer')

    // Verify words were copied
    const copiedWords = mockSupabase.from.mock.results[4].value.insert.mock.calls[0][0]
    expect(copiedWords).toHaveLength(2)
    expect(copiedWords[0]).toMatchObject({ collection_id: 'newcol', word: 'Apple' })
  })

  test('User with no access cannot copy a collection (403)', async () => {
    const mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'stranger' } } }) },
      from: jest.fn()
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })) }) // not owner
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(makeChain({ data: null, error: null })) }), // no access
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/collections/col1/copy', {
      method: 'POST',
      body: JSON.stringify({ name: 'Steal' }),
    })
    const res = await copyCollection(req, { params: { id: 'col1' } })
    expect(res.status).toBe(403)
  })
})

describe('Unauthenticated requests to protected routes', () => {
  beforeEach(() => jest.clearAllMocks())

  const unauthedSupabase = () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  })

  test('POST /api/collections returns 401 without auth', async () => {
    mockCreateServerClient.mockReturnValue(unauthedSupabase())
    const req = new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await createCollection(req)
    expect(res.status).toBe(401)
  })

  test('POST /api/collections/[id]/words returns 401 without auth', async () => {
    mockCreateServerClient.mockReturnValue(unauthedSupabase())
    const req = new NextRequest('http://localhost/api/collections/col1/words', {
      method: 'POST',
      body: JSON.stringify({ word: 'Test' }),
    })
    const res = await addWord(req, { params: { id: 'col1' } })
    expect(res.status).toBe(401)
  })

  test('POST /api/collections/[id]/share returns 401 without auth', async () => {
    mockCreateServerClient.mockReturnValue(unauthedSupabase())
    const req = new NextRequest('http://localhost/api/collections/col1/share', {
      method: 'POST',
      body: JSON.stringify({ access_type: 'view' }),
    })
    const res = await generateShare(req, { params: { id: 'col1' } })
    expect(res.status).toBe(401)
  })

  test('POST /api/collections/import/[share_code] returns 401 without auth', async () => {
    mockCreateServerClient.mockReturnValue(unauthedSupabase())
    const req = new NextRequest('http://localhost/api/collections/import/ABCD1234', { method: 'POST' })
    const res = await doImport(req, { params: { share_code: 'ABCD1234' } })
    expect(res.status).toBe(401)
  })

  test('POST /api/collections/[id]/copy returns 401 without auth', async () => {
    mockCreateServerClient.mockReturnValue(unauthedSupabase())
    const req = new NextRequest('http://localhost/api/collections/col1/copy', {
      method: 'POST',
      body: JSON.stringify({ name: 'Copy' }),
    })
    const res = await copyCollection(req, { params: { id: 'col1' } })
    expect(res.status).toBe(401)
  })
})
