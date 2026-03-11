'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import LogoutButton from '@/components/LogoutButton'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      {/* Glow blob */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-700 opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        {/* Logo mark */}
        <Image src="/amonguslogo.png" alt="Imposter logo" width={100} height={100} priority />

        <div>
          <h1 className="text-5xl font-black tracking-tight text-white">Imposter</h1>
          <p className="mt-3 text-slate-400 text-lg leading-relaxed">
            One player is the imposter. Everyone else knows the word. Can you find them?
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/game/setup"
            className="btn-primary text-lg py-4 w-full rounded-2xl shadow-lg shadow-violet-900/40"
          >
            Play Now
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="btn-secondary text-base w-full rounded-2xl">
                My Collections
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/auth/signup"
              className="btn-secondary text-base w-full rounded-2xl"
            >
              Create Account
            </Link>
          )}
        </div>

        {!isLoggedIn && (
          <p className="text-slate-500 text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}
