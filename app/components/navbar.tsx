'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
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
    setMenuOpen(false)
    router.push('/')
  }

  return (
    <nav className="border-b border-gray-800 px-6 py-4 bg-gray-950">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-green-400">
          SportingIQ
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/quiz" className="text-sm text-gray-300 hover:text-white transition">Quiz</Link>
          <Link href="/leaderboard" className="text-sm text-gray-300 hover:text-white transition">Leaderboard</Link>
          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/profile" className="text-sm text-gray-300 hover:text-white transition">Profile</Link>
                  <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">Log out</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-gray-300 hover:text-white transition">Login</Link>
                  <Link href="/signup" className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition">Sign Up Free</Link>
                </>
              )}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-300 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4 space-y-3">
          <Link href="/quiz" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-300 hover:text-white transition py-2">Quiz</Link>
          <Link href="/leaderboard" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-300 hover:text-white transition py-2">Leaderboard</Link>
          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-300 hover:text-white transition py-2">Profile</Link>
                  <button onClick={handleLogout} className="block text-sm text-gray-400 hover:text-white transition py-2">Log out</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-300 hover:text-white transition py-2">Login</Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition text-center">Sign Up Free</Link>
                </>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  )
}
