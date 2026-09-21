'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface CupEntry {
  userId: string
  username: string
  gamesPlayed: number
  wins: number
  goals: number
}

type Metric = 'wins' | 'goals'
type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'alltime'

export default function CupLeaderboard() {
  const [entries, setEntries] = useState<CupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<Metric>('wins')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily')

  useEffect(() => {
    loadCupResults()
  }, [timePeriod])

  const loadCupResults = async () => {
    setLoading(true)

    let query = supabase
      .from('cup_results')
      .select('user_id, won, goals_scored')

    if (timePeriod === 'daily') {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      query = query.gte('created_at', startOfToday.toISOString())
    } else if (timePeriod === 'weekly') {
      const startOfWeek = new Date()
      const dayOfWeek = startOfWeek.getDay() // 0=Sunday, 1=Monday, ... 6=Saturday
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      query = query.gte('created_at', startOfWeek.toISOString())
    } else if (timePeriod === 'monthly') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      query = query.gte('created_at', startOfMonth.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading cup results', error)
      setEntries([])
      setLoading(false)
      return
    }

    if (data && data.length > 0) {
      const byUser = new Map<string, { gamesPlayed: number, wins: number, goals: number }>()

      data.forEach((row) => {
        const uid = row.user_id
        const existing = byUser.get(uid) || { gamesPlayed: 0, wins: 0, goals: 0 }
        existing.gamesPlayed += 1
        if (row.won) existing.wins += 1
        existing.goals += row.goals_scored || 0
        byUser.set(uid, existing)
      })

      const userIds = Array.from(byUser.keys())
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error loading profiles for cup leaderboard', profilesError)
      }

      const usernameById = new Map((profiles || []).map(p => [p.id, p.username]))

      const aggregated: CupEntry[] = userIds.map(uid => {
        const stats = byUser.get(uid)!
        return {
          userId: uid,
          username: usernameById.get(uid) || 'Anonymous',
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          goals: stats.goals,
        }
      })

      setEntries(aggregated)
    } else {
      setEntries([])
    }

    setLoading(false)
  }

  const sortedEntries = [...entries].sort((a, b) => {
    if (metric === 'goals') return b.goals - a.goals
    return b.wins - a.wins
  })

  const metrics: { key: Metric, label: string }[] = [
    { key: 'wins', label: 'Most Wins' },
    { key: 'goals', label: 'Most Goals' },
  ]

  const timePeriods: { key: TimePeriod, label: string }[] = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'alltime', label: 'All Time' },
  ]

  const valueFor = (entry: CupEntry) => {
    if (metric === 'goals') return `${entry.goals} ⚽`
    return `${entry.wins} 🏆`
  }

  return (
    <div>
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {timePeriods.map((p) => (
          <button
            key={p.key}
            onClick={() => setTimePeriod(p.key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap flex-shrink-0 ${
              timePeriod === p.key
                ? 'bg-green-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap flex-shrink-0 ${
              metric === m.key
                ? 'bg-green-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : sortedEntries.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-4">🏆</div>
          <p>No cup results yet. Be the first!</p>
          <Link href="/cup" className="inline-block mt-4 px-6 py-2 bg-green-500 text-black font-bold rounded-lg">
            Start a Cup Run
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEntries.slice(0, 3).map((entry, index) => (
            <div
              key={entry.userId}
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
                  <div className="text-gray-400 text-sm">{entry.gamesPlayed} cup{entry.gamesPlayed === 1 ? '' : 's'} played</div>
                </div>
              </div>
              <div className="text-green-400 font-bold text-lg">{valueFor(entry)}</div>
            </div>
          ))}

          {sortedEntries.slice(3).map((entry, index) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between p-4 rounded-xl border bg-gray-900 border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="text-gray-500 font-bold w-8">{index + 4}</div>
                <div>
                  <div className="font-semibold">{entry.username}</div>
                  <div className="text-gray-400 text-sm">{entry.gamesPlayed} cup{entry.gamesPlayed === 1 ? '' : 's'} played</div>
                </div>
              </div>
              <div className="text-green-400 font-bold text-lg">{valueFor(entry)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
