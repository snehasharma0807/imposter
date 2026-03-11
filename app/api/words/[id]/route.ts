import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE(
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

  // Check if word belongs to user's collection
  const { data: word, error: wordError } = await supabase
    .from('words')
    .select('collection_id')
    .eq('id', id)
    .single()

  if (wordError || !word) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 })
  }

  const { data: ownerCheck } = await supabase
    .from('collections')
    .select('id')
    .eq('id', word.collection_id)
    .eq('user_id', user.id)
    .single()

  if (!ownerCheck) {
    const { data: access } = await supabase
      .from('collection_access')
      .select('access_type')
      .eq('collection_id', word.collection_id)
      .eq('user_id', user.id)
      .single()
    if (!access || access.access_type !== 'edit') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
