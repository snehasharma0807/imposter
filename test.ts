import { config } from 'dotenv'

config({ path: '.env.local' })

import { createClient } from './lib/supabase'

try {
  const supabase = createClient()
  console.log('Supabase client initialized successfully')
} catch (error) {
  console.error('Error initializing Supabase client:', error)
  process.exit(1)
}