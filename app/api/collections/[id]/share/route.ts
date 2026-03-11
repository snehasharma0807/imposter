import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

// POST /api/collections/[id]/share — generate a share code for this collection
// Body: { access_type: 'edit' | 'view' }
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

  // Owner only
  const { data: col } = await supabase
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!col) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const { access_type }: { access_type: 'edit' | 'view' } = await request.json()
  if (access_type !== 'edit' && access_type !== 'view') {
    return NextResponse.json({ error: 'access_type must be edit or view' }, { status: 400 })
  }

  // If a code for this type already exists, return it
  const { data: existing } = await supabase
    .from('collection_access')
    .select('share_code')
    .eq('collection_id', id)
    .eq('access_type', access_type)
    .is('user_id', null)
    .single()

  if (existing?.share_code) {
    return NextResponse.json({ share_code: existing.share_code, access_type })
  }

  const shareCode = randomBytes(4).toString('hex').toUpperCase()
  const { error } = await supabase
    .from('collection_access')
    .insert({ collection_id: id, access_type, share_code: shareCode })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ share_code: shareCode, access_type }, { status: 201 })
}

// DELETE /api/collections/[id]/share?type=edit|view — revoke a share code
export async function DELETE(
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

  // Owner only
  const { data: col } = await supabase
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!col) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const accessType = url.searchParams.get('type')
  if (accessType !== 'edit' && accessType !== 'view') {
    return NextResponse.json({ error: 'type param must be edit or view' }, { status: 400 })
  }

  const { error } = await supabase
    .from('collection_access')
    .delete()
    .eq('collection_id', id)
    .eq('access_type', accessType)
    .is('user_id', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
