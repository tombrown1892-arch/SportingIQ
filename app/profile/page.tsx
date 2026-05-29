'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Profile {
  username: string
  is_premium: boolean
  streak: number
  longest_streak: number
  created_at: string
}

interface QuizResult {
  score: number
  time_seconds: number
  total_points: number
  completed_at: string
  quizzes: {
    title: string
    quiz_date: string
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [results, setResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'rankings'>('stats')
  const [todayRank, setTodayRank] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState<number>(0)
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null)
  const [monthlyRank, setMonthlyRank] = useState<number | null>(null)
  const [alltimeRank, setAlltimeRank] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    const { data: resultsData } = await supabase
      .from('quiz_results')
      .select(`
        score,
        time_seconds,
        total_points,
        completed_at,
        quizzes (title, quiz_date)
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(20)

    if (resultsData) {
      setResults(resultsData as any)
    }

    if (profileData?.is_premium) {
      await loadRankings(user.id, profileData.username)
    }

    setLoading(false)
  }

  const loadRankings = async (userId: string, username: string) => {
    // Today's rank
    const today = new Date().toISOString().split('T')[0]
    const { data: todayQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('quiz_date', today)
      .single()

    if (todayQuiz) {
      const { data: todayResults } = await supabase
        .from('quiz_results')
        .select('user_id, total_points, profiles(username)')
        .eq('quiz_id', todayQuiz.id)
        .order('total_points', { ascending: false })

      if (todayResults) {
        setTotalPlayers(todayResults.length)
        const rank = todayResults.findIndex((r: any) => r.profiles?.username === username)
        if (rank !== -1) setTodayRank(rank + 1)
      }
    }

    // Weekly rank
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data: weeklyResults } = await supabase
      .from('quiz_results')
      .select('user_id, total_points, profiles(username)')
      .gte('completed_at', weekAgo.toISOString())
      .order('total_points', { ascending: false })

    if (weeklyResults) {
      const rank = weeklyResults.findIndex((r: any) => r.profiles?.username === username)
      if (rank !== -1) setWeeklyRank(rank + 1)
    }

    // Monthly rank
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const { data: monthlyResults } = await supabase
      .from('quiz_results')
      .select('user_id, total_points, profiles(username)')
      .gte('completed_at', monthAgo.toISOString())
      .order('total_points', { ascending: false })

    if (monthlyResults) {
      const rank = monthlyResults.findIndex((r: any) => r.profiles?.username === username)
      if (rank !== -1) setMonthlyRank(rank + 1)
    }

    // All time rank
    const { data: alltimeResults } = await supabase
      .from('quiz_results')
      .select('user_id, total_points, profiles(username)')
      .order('total_points', { ascending: false })

    if (alltimeResults) {
      const rank = alltimeResults.findIndex((r: any) => r.profiles?.username === username)
      if (rank !== -1) setAlltimeRank(rank + 1)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  const totalQuizzes = results.length
  const averageScore = totalQuizzes > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes * 10) / 10
    : 0
  const bestScore = totalQuizzes > 0
    ? Math.max(...results.map(r => r.total_points))
    : 0

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-green-400 font-bold text-lg">SportingIQ</Link>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">
            Log out
          </button>
        </div>

        {/* Profile header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{profile?.username}</h1>
              <p className="text-gray-400 text-sm mt-1">
                Member since {new Date(profile?.created_at || '').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              profile?.is_premium
                ? 'bg-green-500/20 text-green-400 border border-green-700'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {profile?.is_premium ? '⭐ Premium' : 'Free'}
            </div>
          </div>

          {!profile?.is_premium && (
            <Link
              href="/premium"
              className="block w-full text-center py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition text-sm"
            >
              Upgrade to Premium — £2.99/month
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'stats' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            My Stats
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'rankings' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            My Rankings {!profile?.is_premium && '🔒'}
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-3xl mb-1">🔥</div>
                <div className="text-3xl font-bold text-green-400">{profile?.streak || 0}</div>
                <div className="text-gray-400 text-sm">Current Streak</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-3xl mb-1">⭐</div>
                <div className="text-3xl font-bold text-green-400">{profile?.longest_streak || 0}</div>
                <div className="text-gray-400 text-sm">Longest Streak</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-3xl mb-1">📊</div>
                <div className="text-3xl font-bold text-green-400">{averageScore}/10</div>
                <div className="text-gray-400 text-sm">Average Score</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-3xl mb-1">🏆</div>
                <div className="text-3xl font-bold text-green-400">{bestScore}</div>
                <div className="text-gray-400 text-sm">Best Points</div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Quiz History</h2>
              {results.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No quizzes taken yet.</p>
                  <Link href="/quiz" className="inline-block mt-3 px-6 py-2 bg-green-500 text-black font-bold rounded-lg text-sm">
                    Take Today's Quiz
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{result.quizzes?.title || 'Daily Quiz'}</div>
                        <div className="text-gray-400 text-xs mt-1">
                          {new Date(result.completed_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400">{result.score}/10</div>
                        <div className="text-gray-400 text-xs">{result.total_points} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <>
            {!profile?.is_premium ? (
              <div className="bg-gray-900 border border-green-800 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
                <p className="text-gray-400 mb-6">Upgrade to see exactly where you rank against every player — today, this week, this month and all time.</p>
                <Link
                  href="/premium"
                  className="inline-block px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
                >
                  Go Premium — £2.99/month
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-green-400 font-semibold text-sm mb-4">TODAY'S QUIZ</h3>
                  {todayRank ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-4xl font-bold">#{todayRank}</div>
                        <div className="text-gray-400 text-sm mt-1">out of {totalPlayers} players</div>
                      </div>
                      <div className="text-5xl">
                        {todayRank === 1 ? '🥇' : todayRank === 2 ? '🥈' : todayRank === 3 ? '🥉' : '🎯'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <p>You haven't played today's quiz yet.</p>
                      <Link href="/quiz" className="inline-block mt-3 px-4 py-2 bg-green-500 text-black font-bold rounded-lg text-sm">
                        Play Now
                      </Link>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                    <div className="text-2xl font-bold text-green-400">{weeklyRank ? `#${weeklyRank}` : '-'}</div>
                    <div className="text-gray-400 text-sm mt-1">This Week</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                    <div className="text-2xl font-bold text-green-400">{monthlyRank ? `#${monthlyRank}` : '-'}</div>
                    <div className="text-gray-400 text-sm mt-1">This Month</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                    <div className="text-2xl font-bold text-green-400">{alltimeRank ? `#${alltimeRank}` : '-'}</div>
                    <div className="text-gray-400 text-sm mt-1">All Time</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}
