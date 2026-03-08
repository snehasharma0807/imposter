import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { word }: { word: string } = await request.json()
  if (!word) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 })
  }

  // Check if collection belongs to user
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (collectionError || !collection) {
    return NextResponse.json({ error: 'Collection not found or access denied' }, { status: 404 })
  }

  const { data: newWord, error } = await supabase
    .from('words')
    .insert({
      collection_id: params.id,
      word: word.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newWord, { status: 201 })
}