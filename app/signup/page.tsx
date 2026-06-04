'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SignUpContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setMessage('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, username }, { onConflict: 'id' })

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setMessage('Account created! You can now log in.')
      setLoading(false)
      return
    }

    // Save guest quiz result if exists
    const guestResult = localStorage.getItem('guestQuizResult')
    if (guestResult) {
      try {
        const result = JSON.parse(guestResult)
        await supabase.from('quiz_results').insert({
          user_id: data.user.id,
          quiz_id: result.quiz_id,
          score: result.score,
          time_seconds: result.time_seconds,
          total_points: result.total_points,
        })
        localStorage.removeItem('guestQuizResult')

        // Update streak
        const today = new Date().toISOString().split('T')[0]
        await supabase
          .from('profiles')
          .update({ streak: 1, longest_streak: 1, last_played: today })
          .eq('id', data.user.id)

        // Redirect to results
        router.push(`/results?score=${result.score}&time=${result.time_seconds}&points=${result.total_points}`)
        return
      } catch (e) {
        localStorage.removeItem('guestQuizResult')
      }
    }

    // If premium plan selected go to premium page
    if (plan === 'premium') {
      router.push('/premium')
      return
    }

    router.push('/quiz')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-green-400">SportingIQ</h1>
          </Link>
          <p className="text-gray-400 mt-2">
            {plan === 'premium' ? 'Create your account to go Premium' : 'Create your free account'}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="sportsfan123"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className="text-sm text-red-400">{message}</p>
            )}

            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : plan === 'premium' ? 'Create Account & Go Premium' : 'Create Free Account'}
            </button>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950"/>}>
      <SignUpContent />
    </Suspense>
  )
}
