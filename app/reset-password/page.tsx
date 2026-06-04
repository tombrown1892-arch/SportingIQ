'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for access token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (accessToken && type === 'recovery') {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      }).then(() => {
        setReady(true)
      })
    } else {
      // Also listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Password updated successfully!')
    setTimeout(() => router.push('/login'), 2000)
    setLoading(false)
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Verifying your reset link...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-green-400">SportingIQ</h1>
          </Link>
          <p className="text-gray-400 mt-2">Choose a new password</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
