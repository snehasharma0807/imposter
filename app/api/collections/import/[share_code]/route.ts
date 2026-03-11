import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET /api/collections/import/[share_code] — public preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ share_code: string }> }
) {
  const { share_code } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  // Look up share link in collection_access (user_id IS NULL = active share link)
  const { data: link } = await supabase
    .from('collection_access')
    .select('collection_id, access_type')
    .eq('share_code', share_code)
    .is('user_id', null)
    .single()

  if (!link) {
    return NextResponse.json({ error: 'Share code not found' }, { status: 404 })
  }

  const { data: col } = await supabase
    .from('collections')
    .select('id, name, created_at')
    .eq('id', link.collection_id)
    .single()

  if (!col) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const { data: words } = await supabase
    .from('words')
    .select('id, word')
    .eq('collection_id', link.collection_id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ...col, access_type: link.access_type, words: words ?? [] })
}

// POST /api/collections/import/[share_code] — save to user's account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ share_code: string }> }
) {
  const { share_code } = await params
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

  // Find the active share link
  const { data: link } = await supabase
    .from('collection_access')
    .select('collection_id, access_type')
    .eq('share_code', share_code)
    .is('user_id', null)
    .single()

  if (!link) {
    return NextResponse.json({ error: 'Share code not found' }, { status: 404 })
  }

  // Check if user already has access
  const { data: existing } = await supabase
    .from('collection_access')
    .select('id')
    .eq('collection_id', link.collection_id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    // Grant access
    const { error } = await supabase
      .from('collection_access')
      .insert({
        collection_id: link.collection_id,
        user_id: user.id,
        access_type: link.access_type,
      })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { data: col } = await supabase
    .from('collections')
    .select('id, name, created_at')
    .eq('id', link.collection_id)
    .single()

  return NextResponse.json({ ...col, access_type: link.access_type }, { status: 201 })
}
