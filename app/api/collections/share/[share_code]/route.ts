import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ share_code: string }> }
) {
  const { share_code } = await params
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

  const { data: collection, error } = await supabase
    .from('collections')
    .select(`
      id,
      name,
      share_code,
      created_at,
      words (
        id,
        word,
        created_at
      )
    `)
    .eq('share_code', share_code)
    .single()

  if (error || !collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  return NextResponse.json(collection)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ share_code: string }> }
) {
  const { share_code } = await params
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

  const { data: sourceCollection, error: fetchError } = await supabase
    .from('collections')
    .select(`
      id,
      name,
      words (
        id,
        word
      )
    `)
    .eq('share_code', share_code)
    .single()

  if (fetchError || !sourceCollection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const newShareCode = randomBytes(4).toString('hex').toUpperCase()
  const { data: newCollection, error: createError } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: sourceCollection.name,
      share_code: newShareCode,
    })
    .select()
    .single()

  if (createError || !newCollection) {
    return NextResponse.json(
      { error: createError?.message || 'Failed to create collection' },
      { status: 500 }
    )
  }

  if (sourceCollection.words && sourceCollection.words.length > 0) {
    const wordsToInsert = sourceCollection.words.map((w: { word: string }) => ({
      collection_id: newCollection.id,
      word: w.word,
    }))

    const { error: wordsError } = await supabase
      .from('words')
      .insert(wordsToInsert)

    if (wordsError) {
      return NextResponse.json({ error: wordsError.message }, { status: 500 })
    }
  }

  return NextResponse.json(newCollection, { status: 201 })
}
