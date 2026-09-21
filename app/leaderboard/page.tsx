'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CupLeaderboard from '@/app/components/CupLeaderboard'

interface LeaderboardEntry {
  username: string
  total_points: number
  score: number
  time_seconds: number
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [gameTab, setGameTab] = useState<'quiz' | 'cup'>('quiz')
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'alltime'>('daily')
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    loadLeaderboard()
  }, [activeTab, user])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadLeaderboard = async () => {
    setLoading(true)
    setMyRank(null)
    setMyEntry(null)

    let query = supabase
      .from('quiz_results')
      .select(`
        total_points,
        score,
        time_seconds,
        profiles (username)
      `)
      .order('total_points', { ascending: false })
      .limit(100)

    if (activeTab === 'daily') {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayQuiz } = await supabase
        .from('quizzes')
        .select('id')
        .eq('quiz_date', today)
        .single()
      if (todayQuiz) {
        query = query.eq('quiz_id', todayQuiz.id)
      }
    } else if (activeTab === 'weekly') {
      const startOfWeek = new Date()
      const dayOfWeek = startOfWeek.getDay() // 0=Sunday, 1=Monday, ... 6=Saturday
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      query = query.gte('completed_at', startOfWeek.toISOString())
    } else if (activeTab === 'monthly') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      query = query.gte('completed_at', startOfMonth.toISOString())
    }

    const { data } = await query

    if (data) {
      const formatted = data.map((entry: any) => ({
        username: entry.profiles?.username || 'Anonymous',
        total_points: entry.total_points,
        score: entry.score,
        time_seconds: entry.time_seconds,
      }))
      setEntries(formatted)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()

        const myIndex = formatted.findIndex(e => e.username === profile?.username)
        if (myIndex !== -1) {
          setMyRank(myIndex + 1)
          setMyEntry(formatted[myIndex])
        }
      }
    }

    setLoading(false)
  }

  const tabs = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'alltime', label: 'All Time' },
  ]

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-gray-400 mb-6">See how you stack up against other players</p>

        {/* Game tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setGameTab('quiz')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              gameTab === 'quiz'
                ? 'bg-green-500 text-black'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Daily Quiz
          </button>
          <button
            onClick={() => setGameTab('cup')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              gameTab === 'cup'
                ? 'bg-green-500 text-black'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Cup Game
          </button>
        </div>

        {gameTab === 'cup' && <CupLeaderboard />}

        {gameTab === 'quiz' && (
        <>
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pinned rank with full position */}
        {myEntry && myRank && myRank > 3 && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6">
            <p className="text-green-400 text-sm font-medium mb-2">Your Position</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-gray-400 font-bold w-8">#{myRank}</div>
                <div>
                  <div className="font-semibold">{myEntry.username}</div>
                  <div className="text-gray-400 text-sm">{myEntry.score}/10 correct • {myEntry.time_seconds}s</div>
                </div>
              </div>
              <div className="text-green-400 font-bold text-lg">{myEntry.total_points} pts</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-4">🏆</div>
            <p>No results yet. Be the first!</p>
            <Link href="/quiz" className="inline-block mt-4 px-6 py-2 bg-green-500 text-black font-bold rounded-lg">
              Take Today's Quiz
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 3).map((entry, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  index === 0 ? 'bg-yellow-900/20 border-yellow-700' :
                  index === 1 ? 'bg-gray-700/20 border-gray-600' :
                  'bg-orange-900/20 border-orange-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold w-8">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div>
                    <div className="font-semibold">{entry.username}</div>
                    <div className="text-gray-400 text-sm">{entry.score}/10 correct • {entry.time_seconds}s</div>
                  </div>
                </div>
                <div className="text-green-400 font-bold text-lg">{entry.total_points} pts</div>
              </div>
            ))}

            {entries.slice(3).map((entry, index) => (
              <div
                key={index + 3}
                className="flex items-center justify-between p-4 rounded-xl border bg-gray-900 border-gray-800"
              >
                <div className="flex items-center gap-4">
                  <div className="text-gray-500 font-bold w-8">{index + 4}</div>
                  <div>
                    <div className="font-semibold">{entry.username}</div>
                    <div className="text-gray-400 text-sm">{entry.score}/10 correct • {entry.time_seconds}s</div>
                  </div>
                </div>
                <div className="text-green-400 font-bold text-lg">{entry.total_points} pts</div>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </main>
  )
}