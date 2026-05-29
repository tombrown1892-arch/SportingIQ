'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
  const [isPremium, setIsPremium] = useState(false)
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
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()
      setIsPremium(profile?.is_premium || false)
    }
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
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('completed_at', weekAgo.toISOString())
    } else if (activeTab === 'monthly') {
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      query = query.gte('completed_at', monthAgo.toISOString())
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

  const visibleEntries = isPremium ? entries : entries.slice(0, 3)

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-green-400 font-bold text-lg">SportingIQ</Link>
          {!user && (
            <Link href="/login" className="text-sm text-gray-400 hover:text-white">Login</Link>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-gray-400 mb-8">See how you stack up against other players</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['daily', 'weekly', 'monthly', 'alltime'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'daily' ? 'Today' : tab === 'weekly' ? 'This Week' : tab === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

        {/* My position pinned at top */}
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

        {/* Leaderboard */}
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
            {visibleEntries.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  index === 0 ? 'bg-yellow-900/20 border-yellow-700' :
                  index === 1 ? 'bg-gray-700/20 border-gray-600' :
                  index === 2 ? 'bg-orange-900/20 border-orange-800' :
                  'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold w-8 ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-orange-400' :
                    'text-gray-500'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{entry.username}</div>
                    <div className="text-gray-400 text-sm">{entry.score}/10 correct • {entry.time_seconds}s</div>
                  </div>
                </div>
                <div className="text-green-400 font-bold text-lg">{entry.total_points} pts</div>
              </div>
            ))}

            {/* Premium blur overlay */}
            {!isPremium && entries.length > 3 && (
              <div className="relative">
                <div className="space-y-3 blur-sm pointer-events-none">
                  {entries.slice(3, 8).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl border bg-gray-900 border-gray-800">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 text-center shadow-xl">
                    <div className="text-2xl mb-2">🏆</div>
                    <p className="font-bold mb-1">Unlock Full Leaderboard</p>
                    <p className="text-gray-400 text-sm mb-4">See every player's ranking with Premium</p>
                    <Link href="/premium" className="inline-block px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition">
                      Go Premium — £2.99/mo
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
