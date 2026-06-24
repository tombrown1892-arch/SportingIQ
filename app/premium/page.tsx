'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PremiumPage() {
  const [user, setUser] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()
      setIsPremium(profile?.is_premium || false)
    }

    setLoading(false)
  }

  const handleCheckout = async (plan: string) => {
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setCheckoutLoading(plan)

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: plan,
        userId: user.id,
        email: user.email,
      }),
    })

    const { url, error } = await response.json()

    if (error) {
      alert('Something went wrong: ' + error)
      setCheckoutLoading(null)
      return
    }

    window.location.href = url
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  if (isPremium) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-2xl font-bold mb-2">You're already Premium!</h2>
          <p className="text-gray-400 mb-6">Enjoy full access to all FootyGames features.</p>
          <Link href="/profile" className="px-6 py-2 bg-green-500 text-black font-bold rounded-lg">
            View Profile
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-12">
          <Link href="/" className="text-green-400 font-bold text-xl">FootyGames</Link>
          <h2 className="text-4xl font-bold mt-6 mb-4">Go Premium</h2>
          <p className="text-gray-400 text-lg">Unlock the full FootyGames experience</p>
        </div>

        {/* Features list */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-10">
          <h3 className="text-lg font-bold mb-6 text-center">Everything in Premium</h3>
          <div className="space-y-4">
            {[
              { icon: '🏆', title: 'Full Leaderboards', desc: 'See exactly where you rank against every player — daily, weekly, monthly and all time' },
              { icon: '🔥', title: 'Streak Protection', desc: 'Your streak is tracked and protected — see your longest streak ever' },
              { icon: '📊', title: 'Detailed Rankings', desc: 'See your rank across all timeframes directly on your profile' },
              { icon: '🎯', title: 'Bonus Quizzes', desc: 'Access extra quizzes beyond the daily one' },
              { icon: '📅', title: 'Quiz Archive', desc: 'Go back and play any previous daily quiz you missed' },
              { icon: '🏅', title: 'Badges & Profile', desc: 'Earn badges for streaks, perfect scores and top finishes' },
              { icon: '🚫', title: 'No Ads', desc: 'Clean, distraction free experience throughout' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="text-2xl">{feature.icon}</div>
                <div>
                  <div className="font-semibold">{feature.title}</div>
                  <div className="text-gray-400 text-sm">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Monthly */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <h3 className="text-lg font-bold mb-2">Monthly</h3>
            <div className="text-5xl font-bold text-green-400 mb-1">£2.99</div>
            <p className="text-gray-400 text-sm mb-6">per month</p>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={checkoutLoading === 'monthly'}
              className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition disabled:opacity-50"
            >
              {checkoutLoading === 'monthly' ? 'Loading...' : 'Get Monthly'}
            </button>
          </div>

          {/* Yearly */}
          <div className="bg-gray-900 border border-green-700 rounded-2xl p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              BEST VALUE
            </div>
            <h3 className="text-lg font-bold mb-2">Yearly</h3>
            <div className="text-5xl font-bold text-green-400 mb-1">£19.99</div>
            <p className="text-gray-400 text-sm mb-1">per year</p>
            <p className="text-green-400 text-sm font-medium mb-6">Save 44%</p>
            <button
              onClick={() => handleCheckout('yearly')}
              disabled={checkoutLoading === 'yearly'}
              className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition disabled:opacity-50"
            >
              {checkoutLoading === 'yearly' ? 'Loading...' : 'Get Yearly'}
            </button>
          </div>
        </div>

        {!user && (
          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300">Log in</Link>
            {' '}to upgrade.
          </p>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          Cancel anytime. Payments securely processed by Stripe.
        </p>
      </div>
    </main>
  )
}
