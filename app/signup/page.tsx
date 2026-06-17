'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { checkAndAwardBadges } from '@/lib/badges'

function SignUpContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single()

      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleSignUp = async () => {
    setMessage('')

    if (usernameStatus === 'taken') {
      setMessage('That username is already taken. Please choose another.')
      return
    }

    if (usernameStatus !== 'available') {
      setMessage('Please enter a valid username.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

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

    await supabase
      .from('badges')
      .upsert({ user_id: data.user.id, badge_type: 'founding_member' }, { onConflict: 'user_id,badge_type' })

    const guestResult = localStorage.getItem('guestQuizResult')
    if (guestResult) {
      try {
        const result = JSON.parse(guestResult)

        const { data: existingResult } = await supabase
          .from('quiz_results')
          .select('id')
          .eq('user_id', data.user.id)
          .eq('quiz_id', result.quiz_id)
          .single()

        if (!existingResult) {
          await supabase.from('quiz_results').insert({
            user_id: data.user.id,
            quiz_id: result.quiz_id,
            score: result.score,
            time_seconds: result.time_seconds,
            total_points: result.total_points,
          })

          const today = new Date().toISOString().split('T')[0]
          await supabase
            .from('profiles')
            .update({ streak: 1, longest_streak: 1, last_played: today })
            .eq('id', data.user.id)

          await checkAndAwardBadges(data.user.id, {
            score: result.score,
            time_seconds: result.time_seconds,
            total_points: result.total_points,
            quiz_id: result.quiz_id,
          })
        }

        localStorage.removeItem('guestQuizResult')
        router.push(`/results?score=${result.score}&time=${result.time_seconds}&points=${result.total_points}`)
        return
      } catch (e) {
        localStorage.removeItem('guestQuizResult')
        localStorage.removeItem('guestAnswerBreakdown')
      }
    }

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
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 pr-10"
                  placeholder="sportsfan123"
                />
                {usernameStatus === 'checking' && (
                  <span className="absolute right-3 top-3.5 text-gray-400 text-sm">...</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="absolute right-3 top-3.5 text-green-400">✓</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="absolute right-3 top-3.5 text-red-400">✗</span>
                )}
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-red-400 text-xs mt-1">Username already taken</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-green-400 text-xs mt-1">Username available</p>
              )}
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-white text-sm"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-white text-sm"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                <p className="text-green-400 text-xs mt-1">Passwords match</p>
              )}
            </div>

            {message && (
              <p className="text-sm text-red-400">{message}</p>
            )}

            <button
              onClick={handleSignUp}
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
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
