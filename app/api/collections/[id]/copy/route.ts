import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

// POST /api/collections/[id]/copy — clone a collection into the user's account
// Body: { name: string } (new name for the copy)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name }: { name: string } = await request.json()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Verify user has at least view access (owner, edit, or view)
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
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Fetch source words
  const { data: sourceWords } = await supabase
    .from('words')
    .select('word')
    .eq('collection_id', id)

  // Create new collection
  const shareCode = randomBytes(4).toString('hex').toUpperCase()
  const { data: newCol, error: createError } = await supabase
    .from('collections')
    .insert({ user_id: user.id, name, share_code: shareCode })
    .select()
    .single()

  if (createError || !newCol) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create' }, { status: 500 })
  }

  // Copy words
  if (sourceWords && sourceWords.length > 0) {
    const wordsToInsert = sourceWords.map((w: { word: string }) => ({
      collection_id: newCol.id,
      word: w.word,
    }))
    const { error: wordsError } = await supabase.from('words').insert(wordsToInsert)
    if (wordsError) {
      return NextResponse.json({ error: wordsError.message }, { status: 500 })
    }
  }

  return NextResponse.json(newCol, { status: 201 })
}
