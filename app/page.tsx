'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface TopPlayer {
  username: string
  total_points: number
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [cupsWon, setCupsWon] = useState(0)
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [loadingTop, setLoadingTop] = useState(true)

  useEffect(() => {
    loadUserStats()
    loadTopPlayers()
  }, [])

  const loadUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak')
      .eq('id', user.id)
      .single()
    setStreak(profile?.streak || 0)

    const { data: cupResults } = await supabase
      .from('cup_results')
      .select('won')
      .eq('user_id', user.id)
      .eq('won', true)
    setCupsWon(cupResults?.length || 0)
  }

  const loadTopPlayers = async () => {
    setLoadingTop(true)
    const today = new Date().toISOString().split('T')[0]
    const { data: todayQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('quiz_date', today)
      .single()

    if (todayQuiz) {
      const { data } = await supabase
        .from('quiz_results')
        .select('total_points, profiles (username)')
        .eq('quiz_id', todayQuiz.id)
        .order('total_points', { ascending: false })
        .limit(3)

      if (data) {
        setTopPlayers(data.map((entry: any) => ({
          username: entry.profiles?.username || 'Anonymous',
          total_points: entry.total_points,
        })))
      }
    }
    setLoadingTop(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="text-green-400">Footy</span>Games
        </h1>
        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto">
          The ultimate football knowledge challenge
        </p>
      </section>

      {/* Game cards */}
      <section className="max-w-4xl mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center text-center">
          <div className="text-5xl mb-4">⚽</div>
          <h2 className="text-2xl font-bold mb-2">Daily Quiz</h2>
          <p className="text-gray-400 mb-6">10 questions, once a day. How do you rank?</p>
          {user && (
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
              🔥 {streak} day streak
            </div>
          )}
          <Link
            href="/quiz"
            className="mt-auto w-full inline-block px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
          >
            Play Today's Quiz →
          </Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-2">FootyGames Cup</h2>
          <p className="text-gray-400 mb-6">5 rounds. One champion. Can you lift the trophy?</p>
          {user && (
            <div className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 text-sm font-medium px-3 py-1 rounded-full mb-6">
              🏆 {cupsWon} cup{cupsWon === 1 ? '' : 's'} won
            </div>
          )}
          <Link
            href="/cup"
            className="mt-auto w-full inline-block px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold rounded-xl transition"
          >
            Start Cup Run →
          </Link>
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="max-w-2xl mx-auto px-6 pb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4 text-center">Today's Top Players</h3>

          {loadingTop ? (
            <div className="text-center text-gray-400 py-6">Loading...</div>
          ) : topPlayers.length === 0 ? (
            <div className="text-center text-gray-400 py-6">No results yet today. Be the first!</div>
          ) : (
            <div className="space-y-3 mb-6">
              {topPlayers.map((player, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    index === 0 ? 'bg-yellow-900/20 border-yellow-700' :
                    index === 1 ? 'bg-gray-700/20 border-gray-600' :
                    'bg-orange-900/20 border-orange-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold w-6">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="font-semibold">{player.username}</div>
                  </div>
                  <div className="text-green-400 font-bold">{player.total_points} pts</div>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/leaderboard"
            className="block text-center text-green-400 hover:text-green-300 font-medium transition"
          >
            View Full Leaderboard →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        © 2026 FootyGames. All rights reserved.
      </footer>
    </main>
  )
}
