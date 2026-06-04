
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPassword() {
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [sent, setSent] = useState(false)

	const handleReset = async () => {
		setLoading(true)
		setMessage('')

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		})

		if (error) {
			setMessage(error.message)
			setLoading(false)
			return
		}

		setSent(true)
		setLoading(false)
	}

	if (sent) {
		return (
			<main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
				<div className="w-full max-w-md text-center">
					<div className="text-5xl mb-4">📧</div>
					<h2 className="text-2xl font-bold mb-3">Check your email</h2>
					<p className="text-gray-400 mb-6">We've sent a password reset link to <span className="text-white">{email}</span></p>
					<Link href="/login" className="text-green-400 hover:text-green-300">
						Back to login
					</Link>
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
					<p className="text-gray-400 mt-2">Reset your password</p>
				</div>

				<div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
					<div className="space-y-4">
						<div>
							<label className="text-sm text-gray-400 mb-1 block">Email address</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
								placeholder="you@example.com"
							/>
						</div>

						{message && (
							<p className="text-sm text-red-400">{message}</p>
						)}

						<button
							onClick={handleReset}
							disabled={loading}
							className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition disabled:opacity-50"
						>
							{loading ? 'Sending...' : 'Send Reset Link'}
						</button>
					</div>

					<p className="text-center text-gray-500 text-sm mt-6">
						Remember your password?{' '}
						<Link href="/login" className="text-green-400 hover:text-green-300">
							Login
						</Link>
					</p>
				</div>
			</div>
		</main>
	)
}
