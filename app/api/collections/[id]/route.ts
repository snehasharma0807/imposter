import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
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

  // Try as owner
  const { data: ownerCol } = await supabase
    .from('collections')
    .select('id, name, share_code, created_at, words(id, word, created_at)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (ownerCol) {
    // Include active share codes for owners
    const { data: shareCodes } = await supabase
      .from('collection_access')
      .select('access_type, share_code')
      .eq('collection_id', id)
      .is('user_id', null)
    return NextResponse.json({ ...ownerCol, access_type: 'owner', share_codes: shareCodes ?? [] })
  }

  // Try as access user
  const { data: accessEntry } = await supabase
    .from('collection_access')
    .select('access_type')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .single()

  if (!accessEntry) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const { data: col } = await supabase
    .from('collections')
    .select('id, name, created_at, words(id, word, created_at)')
    .eq('id', id)
    .single()

  if (!col) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  return NextResponse.json({ ...col, access_type: accessEntry.access_type })
}

export async function PATCH(
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

  const { name }: { name: string } = await request.json()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
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

  const { data: collection, error } = await supabase
    .from('collections')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error || !collection) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 500 })
  }

  return NextResponse.json(collection)
}

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

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
