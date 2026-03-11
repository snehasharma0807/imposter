import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { word, words }: { word?: string; words?: string[] } = await request.json()
  if (!word && (!words || words.length === 0)) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 })
  }

  // Check owner or edit-access
  const { data: ownerCheck } = await supabase
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!ownerCheck) {
    const { data: access } = await supabase
      .from('collection_access')
      .select('access_type')
      .eq('collection_id', id)
      .eq('user_id', user.id)
      .single()
    if (!access || access.access_type !== 'edit') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Batch insert
  const wordsToInsert = (words ?? (word ? [word] : []))
    .map((w: string) => ({ collection_id: id, word: w.trim() }))
    .filter((w: { word: string }) => w.word)

  if (words && words.length > 0) {
    const { error } = await supabase.from('words').insert(wordsToInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ count: wordsToInsert.length }, { status: 201 })
  }

  const { data: newWord, error } = await supabase
    .from('words')
    .insert(wordsToInsert[0])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newWord, { status: 201 })
}
