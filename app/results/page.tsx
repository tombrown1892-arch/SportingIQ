'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AnsweredQuestion {
  question: string
  selected: string | null
  correct: string
  correctText: string
  selectedText: string
  isCorrect: boolean
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const score = parseInt(searchParams.get('score') || '0')
  const time = parseInt(searchParams.get('time') || '0')
  const points = parseInt(searchParams.get('points') || '0')
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState<number>(0)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [answerBreakdown, setAnswerBreakdown] = useState<AnsweredQuestion[]>([])

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    const storedBreakdown = localStorage.getItem('guestAnswerBreakdown')
    if (storedBreakdown) {
      try {
        setAnswerBreakdown(JSON.parse(storedBreakdown))
        localStorage.removeItem('guestAnswerBreakdown')
      } catch (e) {
        console.error('Error parsing answer breakdown', e)
      }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    setIsPremium(profile?.is_premium || false)

    const today = new Date().toISOString().split('T')[0]
    const { data: todayQuiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('quiz_date', today)
      .single()

    if (todayQuiz) {
      const { data: allResults } = await supabase
        .from('quiz_results')
        .select('user_id, total_points')
        .eq('quiz_id', todayQuiz.id)
        .order('total_points', { ascending: false })

      if (allResults) {
        setTotalPlayers(allResults.length)
        const rank = allResults.findIndex(r => r.user_id === user.id) + 1
        if (rank > 0) setMyRank(rank)
      }
    }

    setLoading(false)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'FootyGames',
      text: `I scored ${score}/10 on today's FootyGames football quiz! 🏆 Can you beat me?`,
      url: 'https://footygames.vercel.app/quiz',
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`, '_blank')
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-gray-400">Here's how you did today</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6 text-center">
          <div className="text-6xl font-bold text-green-400 mb-2">{score}/10</div>
          <p className="text-gray-400 mb-6">Correct answers</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{time}s</div>
              <div className="text-gray-400">Time taken</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{points}</div>
              <div className="text-gray-400">Total points</div>
            </div>
          </div>
        </div>

        {!loading && isPremium && myRank && (
          <div className="bg-green-900/20 border border-green-700 rounded-2xl p-6 mb-6 text-center">
            <p className="text-green-400 text-sm font-medium mb-1">Your Current Rank</p>
            <div className="text-4xl font-bold">#{myRank}</div>
            <p className="text-gray-400 text-sm mt-1">out of {totalPlayers} players today</p>
            <p className="text-gray-500 text-xs mt-1">Updates live as more people play</p>
          </div>
        )}

        {!loading && !isPremium && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 text-center">
            <p className="text-gray-400 text-sm mb-3">Want to see where you ranked today?</p>
            <Link href="/premium" className="inline-block px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg text-sm transition">
              Upgrade to Premium — £2.99/mo
            </Link>
          </div>
        )}

        {answerBreakdown.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-bold mb-4">Answer Breakdown</h3>
            <div className="space-y-3">
              {answerBreakdown.map((q, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm ${q.isCorrect ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
                  <div className="font-medium mb-2">{q.question}</div>
                  {q.isCorrect ? (
                    <div className="text-green-400 text-xs">✓ Correct — {q.correctText}</div>
                  ) : (
                    <div className="text-xs space-y-1">
                      <div className="text-red-400">✗ Your answer — {q.selectedText || 'No answer'}</div>
                      <div className="text-green-400">✓ Correct — {q.correctText}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <Link href="/leaderboard" className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition text-center">
            Leaderboard
          </Link>
          <Link href="/profile" className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-center">
            My Profile
          </Link>
        </div>

        <button
          onClick={handleShare}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition"
        >
          📤 Share My Score
        </button>
      </div>
    </main>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950"/>}>
      <ResultsContent />
    </Suspense>
  )
}
