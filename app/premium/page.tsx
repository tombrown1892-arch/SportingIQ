'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PremiumPage() {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null)
  const [user, setUser] = useState<any>(null)
  const [checkingUser, setCheckingUser] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setCheckingUser(false)
  }

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan)

    // If not logged in redirect to signup with premium flag
    if (!user) {
      router.push('/signup?plan=premium')
      return
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: user.id,
          email: user.email,
        }),
      })

      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Error:', error)
    }

    setLoading(null)
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-3xl font-bold mb-3">Go Premium</h1>
          <p className="text-gray-400">Get the most out of FootyGames</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Everything in Premium:</h2>
          <div className="space-y-3">
            {[
              'Full leaderboard access — see every player ranked',
              'Your daily, weekly, monthly and all time rankings',
              'No ads',
              'Cup game career stats — wins, goals, win rate',
              'Cup game leaderboard access',
              'Badges and profile',
              'Bonus quizzes and archive access',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-green-400">✅</span>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Monthly */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-lg mb-1">Monthly</h3>
            <div className="text-4xl font-bold text-white mb-1">£2.99</div>
            <p className="text-gray-400 text-sm mb-6">per month</p>
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={loading !== null}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading === 'monthly' ? 'Loading...' : 'Get Monthly'}
            </button>
          </div>

          {/* Yearly */}
          <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              BEST VALUE
            </div>
            <h3 className="font-bold text-lg mb-1">Yearly</h3>
            <div className="text-4xl font-bold text-green-400 mb-1">£19.99</div>
            <p className="text-gray-400 text-sm mb-1">per year</p>
            <p className="text-green-400 text-xs mb-6">Save 44% vs monthly</p>
            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={loading !== null}
              className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading === 'yearly' ? 'Loading...' : 'Get Yearly'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm">
          Cancel anytime from your profile page. No hidden fees.
        </p>
      </div>
    </main>
  )
}
