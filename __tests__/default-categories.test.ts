/** @jest-environment node */
/// <reference types="@jest/globals" />
import * as fs from 'fs'
import * as path from 'path'
import { NextRequest } from 'next/server'
import { GET as getDefaultCategories } from '../app/api/default-categories/route'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn().mockReturnValue(undefined) }),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const mockCreateServerClient = require('@supabase/ssr').createServerClient

// ---------------------------------------------------------------------------
// Seed file structure tests
// ---------------------------------------------------------------------------

describe('Seed file (supabase/seed.sql)', () => {
  const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql')
  let seedSql: string

  beforeAll(() => {
    seedSql = fs.readFileSync(seedPath, 'utf8')
  })

  test('seed file exists', () => {
    expect(fs.existsSync(seedPath)).toBe(true)
  })

  test('seed file contains at least 5 category inserts', () => {
    // Each category is an INSERT VALUES block — count opening ARRAY[ markers
    const matches = seedSql.match(/ARRAY\[/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(5)
  })

  test('every category has at least 20 words', () => {
    // Extract each ARRAY[...] block and count quoted items
    const arrayBlocks = seedSql.match(/ARRAY\[([\s\S]*?)\]/g) ?? []
    expect(arrayBlocks.length).toBeGreaterThanOrEqual(5)

    for (const block of arrayBlocks) {
      const wordCount = (block.match(/'[^']+'/g) ?? []).length
      expect(wordCount).toBeGreaterThanOrEqual(20)
    }
  })

  test('seed file contains the Animals category', () => {
    expect(seedSql).toMatch(/'Animals'/)
  })

  test('seed file contains the Food category', () => {
    expect(seedSql).toMatch(/'Food'/)
  })

  test('seed file contains the Movies category', () => {
    expect(seedSql).toMatch(/'Movies'/)
  })

  test('seed file contains the Sports category', () => {
    expect(seedSql).toMatch(/'Sports'/)
  })

  test('seed file contains the Places category', () => {
    expect(seedSql).toMatch(/'Places'/)
  })

  test('seed file contains the Jobs category', () => {
    expect(seedSql).toMatch(/'Jobs'/)
  })

  test('seed file contains the Objects category', () => {
    expect(seedSql).toMatch(/'Objects'/)
  })
})

// ---------------------------------------------------------------------------
// API route tests
// ---------------------------------------------------------------------------

describe('GET /api/default-categories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockCategories = [
    { id: 'cat1', name: 'Animals', words: ['Lion', 'Tiger', 'Bear'] },
    { id: 'cat2', name: 'Food', words: ['Pizza', 'Sushi', 'Tacos'] },
  ]

  test('returns categories without requiring authentication', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockCategories, error: null }),
        }),
      }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const request = new NextRequest('http://localhost/api/default-categories')
    const response = await getDefaultCategories()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)
    // No auth call should be made
    expect(mockSupabase).not.toHaveProperty('auth')
  })

  test('returns each category with id, name, and words array', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockCategories, error: null }),
        }),
      }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const response = await getDefaultCategories()
    const data = await response.json()

    for (const category of data) {
      expect(category).toHaveProperty('id')
      expect(category).toHaveProperty('name')
      expect(category).toHaveProperty('words')
      expect(Array.isArray(category.words)).toBe(true)
    }
  })

  test('queries the default_categories table ordered by name', async () => {
    const orderMock = jest.fn().mockResolvedValue({ data: mockCategories, error: null })
    const selectMock = jest.fn().mockReturnValue({ order: orderMock })
    const fromMock = jest.fn().mockReturnValue({ select: selectMock })

    mockCreateServerClient.mockReturnValue({ from: fromMock })

    await getDefaultCategories()

    expect(fromMock).toHaveBeenCalledWith('default_categories')
    expect(selectMock).toHaveBeenCalledWith('id, name, words')
    expect(orderMock).toHaveBeenCalledWith('name')
  })

  test('returns 500 when the database returns an error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'relation "default_categories" does not exist' },
          }),
        }),
      }),
    }
    mockCreateServerClient.mockReturnValue(mockSupabase)

    const response = await getDefaultCategories()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('relation "default_categories" does not exist')
  })
})
