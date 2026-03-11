import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Owned collections
  const { data: ownedCols, error: ownedError } = await supabase
    .from('collections')
    .select('id, name, share_code, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 })
  }

  // 2. Collections shared with this user (edit or view access)
  const { data: accessEntries } = await supabase
    .from('collection_access')
    .select('collection_id, access_type')
    .eq('user_id', user.id)

  const ownedIds = new Set((ownedCols ?? []).map((c: { id: string }) => c.id))
  const sharedIds = (accessEntries ?? [])
    .map((e: { collection_id: string }) => e.collection_id)
    .filter((id: string) => !ownedIds.has(id))

  let sharedCols: { id: string; name: string; created_at: string }[] = []
  if (sharedIds.length > 0) {
    const { data } = await supabase
      .from('collections')
      .select('id, name, created_at')
      .in('id', sharedIds)
    sharedCols = data ?? []
  }

  const result = [
    ...(ownedCols ?? []).map((c: Record<string, unknown>) => ({ ...c, access_type: 'owner' })),
    ...sharedCols.map(c => {
      const entry = (accessEntries ?? []).find((e: { collection_id: string }) => e.collection_id === c.id)!
      return { ...c, access_type: entry.access_type }
    }),
  ]

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, words }: { name: string; words?: string[] } = await request.json()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const shareCode = randomBytes(4).toString('hex').toUpperCase()

  const { data: collection, error } = await supabase
    .from('collections')
    .insert({ user_id: user.id, name, share_code: shareCode })
    .select()
    .single()

  if (error || !collection) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })
  }

  // Bulk-insert words if provided
  if (words && words.length > 0) {
    const wordsToInsert = words
      .map((w: string) => ({ collection_id: collection.id, word: w.trim() }))
      .filter((w: { word: string }) => w.word)
    if (wordsToInsert.length > 0) {
      const { error: wordsError } = await supabase.from('words').insert(wordsToInsert)
      if (wordsError) {
        return NextResponse.json({ error: wordsError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json(collection, { status: 201 })
}