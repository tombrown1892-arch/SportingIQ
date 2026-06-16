'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function JoinContent() {
  const searchParams = useSearchParams()
  const score = searchParams.get('score') || '0'

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold mb-2">You scored {score}/10</h2>
          <p className="text-gray-400">Here's what you're missing out on</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* Free tier */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-1">Free</h3>
            <div className="text-3xl font-bold text-white mb-4">£0</div>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">See your full stats and time</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">See which questions you got wrong</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Your name appears on the leaderboard</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Streak tracking and quiz history</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-red-400 mt-0.5">❌</span>
                <span className="text-gray-500">Can't see the leaderboard</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-red-400 mt-0.5">❌</span>
                <span className="text-gray-500">Can't see your rank position</span>
              </div>
            </div>
            <Link
              href="/signup"
              className="block w-full text-center py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Premium tier */}
          <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              RECOMMENDED
            </div>
            <h3 className="text-xl font-bold mb-1">Premium</h3>
            <div className="text-3xl font-bold text-green-400 mb-4">£2.99<span className="text-sm text-gray-400 font-normal">/mo</span></div>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Everything in free</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Full leaderboard — see every player ranked</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Full daily, weekly, monthly and all time rankings</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">No ads</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Bonus quizzes and archive</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">Badges and profile</span>
              </div>
            </div>
            <Link
              href="/premium"
              className="block w-full text-center py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
            >
              Go Premium
            </Link>
            <p className="text-center text-gray-500 text-xs mt-3">or £19.99/year — save 44%</p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300">Log in</Link>
        </p>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950"/>}>
      <JoinContent />
    </Suspense>
  )
}
