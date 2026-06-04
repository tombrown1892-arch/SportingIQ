'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="border-b border-gray-800 px-6 py-4 bg-gray-950">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-green-400">
          SportingIQ
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/quiz" className="text-sm text-gray-300 hover:text-white transition">
            Quiz
          </Link>
          <Link href="/leaderboard" className="text-sm text-gray-300 hover:text-white transition">
            Leaderboard
          </Link>

          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="text-sm text-gray-300 hover:text-white transition">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-400 hover:text-white transition"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm text-gray-300 hover:text-white transition">
                    Login
                  </Link>
                  <Link href="/signup" className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition">
                    Sign Up Free
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

