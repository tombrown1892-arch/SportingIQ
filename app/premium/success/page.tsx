'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SuccessPage() {
  useEffect(() => {
    upgradeToPremium()
  }, [])

  const upgradeToPremium = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user.id)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold mb-3">Welcome to Premium!</h2>
        <p className="text-gray-400 mb-8">You now have full access to all SportingIQ features.</p>
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
