'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SuccessPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    upgradeToPremium()
  }, [])

  const upgradeToPremium = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Mark as premium
      await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user.id)

      // Award premium member badge
      await supabase
        .from('badges')
        .upsert({ user_id: user.id, badge_type: 'premium_member' }, { onConflict: 'user_id,badge_type' })
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⭐</div>
          <p className="text-gray-400">Setting up your premium account...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold mb-3">Welcome to Premium!</h2>
        <p className="text-gray-400 mb-4">You now have full access to all FootyGames features.</p>
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4 mb-8 inline-block">
          <p className="text-yellow-400 font-bold">⭐ Premium Member badge awarded!</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/quiz" className="px-6 py-3 bg-green-500 text-black font-bold rounded-xl">
            Take Today's Quiz
          </Link>
          <Link href="/leaderboard" className="px-6 py-3 bg-gray-800 text-white rounded-xl">
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  )
}