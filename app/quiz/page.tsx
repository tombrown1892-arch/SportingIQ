'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { checkAndAwardBadges } from '@/lib/badges'
import Link from 'next/link'

interface Question {
  id: string
  question_text: string
  image_url: string | null
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  order_number: number
}

interface Quiz {
  id: string
  title: string
  quiz_date: string
}

export default function QuizPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [totalTime, setTotalTime] = useState(0)
  const [gameState, setGameState] = useState<'loading' | 'briefing' | 'countdown' | 'playing' | 'calculating' | 'finished' | 'no-quiz' | 'already-played'>('loading')
  const [countdown, setCountdown] = useState(3)
  const [user, setUser] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [finalPoints, setFinalPoints] = useState(0)
  const [finalTime, setFinalTime] = useState(0)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState<number>(0)
  const [newBadges, setNewBadges] = useState<string[]>([])
  const [answeredQuestions, setAnsweredQuestions] = useState<{question: string, selected: string | null, correct: string, correctText: string, selectedText: string, isCorrect: boolean}[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scoreRef = useRef(0)
  const totalTimeRef = useRef(0)
  const answeredQuestionsRef = useRef<{question: string, selected: string | null, correct: string, correctText: string, selectedText: string, isCorrect: boolean}[]>([])

  useEffect(() => {
    loadQuiz()
  }, [])

  useEffect(() => {
    if (gameState === 'playing') {
      totalTimerRef.current = setInterval(() => {
        totalTimeRef.current += 1
        setTotalTime(totalTimeRef.current)
      }, 1000)
    }
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current)
    }
  }, [gameState])

  useEffect(() => {
    if (gameState === 'playing' && !answered) {
      setTimeLeft(15)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!)
            handleAnswer(null)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentQuestion, gameState, answered])

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        setGameState('playing')
      }
    }
  }, [gameState, countdown])

  const loadQuiz = async () => {
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

    const today = new Date().toISOString().split('T')[0]
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_date', today)
      .eq('is_active', true)
      .single()

    if (!quizData) {
      setGameState('no-quiz')
      return
    }

    setQuiz(quizData)

    if (user) {
      const { data: existingResult } = await supabase
        .from('quiz_results')
        .select('id')
        .eq('user_id', user.id)
        .eq('quiz_id', quizData.id)
        .single()

      if (existingResult) {
        setGameState('already-played')
        return
      }
    }

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('order_number')

    if (questionsData) {
      setQuestions(questionsData)
      setGameState('briefing')
    }
  }

  const getOptionText = (option: string | null, question: Question) => {
    if (!option) return 'No answer'
    const map: any = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d }
    return map[option]
  }

  const handleAnswer = (answer: string | null) => {
    if (answered) return
    if (timerRef.current) clearInterval(timerRef.current)
    setAnswered(true)
    setSelectedAnswer(answer)

    const currentQ = questions[currentQuestion]
    const isCorrect = answer === currentQ?.correct_answer

    answeredQuestionsRef.current = [...answeredQuestionsRef.current, {
      question: currentQ?.question_text,
      selected: answer,
      correct: currentQ?.correct_answer,
      correctText: getOptionText(currentQ?.correct_answer, currentQ),
      selectedText: getOptionText(answer, currentQ),
      isCorrect
    }]

    if (isCorrect) {
      scoreRef.current = scoreRef.current + 1
    }

    setTimeout(() => {
      if (currentQuestion + 1 >= questions.length) {
        setGameState('calculating')
        finishQuiz()
      } else {
        setCurrentQuestion(c => c + 1)
        setAnswered(false)
        setSelectedAnswer(null)
      }
    }, 1200)
  }

  const finishQuiz = async () => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current)

    const fs = scoreRef.current
    const ft = totalTimeRef.current
    const timeBonus = Math.max(0, 300 - ft)
    const tp = (fs * 100) + timeBonus

    setFinalScore(fs)
    setFinalPoints(tp)
    setFinalTime(ft)
    setAnsweredQuestions(answeredQuestionsRef.current)

    if (!user && quiz) {
      localStorage.setItem('guestQuizResult', JSON.stringify({
        quiz_id: quiz.id,
        score: fs,
        time_seconds: ft,
        total_points: tp,
      }))
    }

    if (user && quiz) {
      // Check if result already exists before inserting
      const { data: existingResult } = await supabase
        .from('quiz_results')
        .select('id')
        .eq('user_id', user.id)
        .eq('quiz_id', quiz.id)
        .single()

      if (!existingResult) {
        await supabase.from('quiz_results').insert({
          user_id: user.id,
          quiz_id: quiz.id,
          score: fs,
          time_seconds: ft,
          total_points: tp,
        })
      }

      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('streak, longest_streak, last_played')
        .eq('id', user.id)
        .single()

      if (currentProfile) {
        let newStreak = 1
        if (currentProfile.last_played === yesterdayStr) {
          newStreak = (currentProfile.streak || 0) + 1
        }
        const newLongest = Math.max(newStreak, currentProfile.longest_streak || 0)

        await supabase
          .from('profiles')
          .update({ streak: newStreak, longest_streak: newLongest, last_played: today })
          .eq('id', user.id)
      }

      const badgesBefore = await supabase
        .from('badges')
        .select('badge_type')
        .eq('user_id', user.id)

      await checkAndAwardBadges(user.id, {
        score: fs,
        time_seconds: ft,
        total_points: tp,
        quiz_id: quiz.id,
      })

      const badgesAfter = await supabase
        .from('badges')
        .select('badge_type')
        .eq('user_id', user.id)

      const beforeTypes = new Set(badgesBefore.data?.map(b => b.badge_type) || [])
      const newlyEarned = badgesAfter.data?.filter(b => !beforeTypes.has(b.badge_type)).map(b => b.badge_type) || []
      setNewBadges(newlyEarned)

      const { data: allResults } = await supabase
        .from('quiz_results')
        .select('user_id, total_points')
        .eq('quiz_id', quiz.id)
        .order('total_points', { ascending: false })

      if (allResults) {
        setTotalPlayers(allResults.length)
        const rank = allResults.findIndex(r => r.user_id === user.id) + 1
        if (rank > 0) setMyRank(rank)
      }
    }

    setTimeout(() => {
      setGameState('finished')
    }, 1500)
  }

  if (gameState === 'loading') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-gray-400">Loading today's quiz...</p>
        </div>
      </main>
    )
  }

  if (gameState === 'briefing') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">⚽</div>
          <h2 className="text-3xl font-bold mb-2">Today's Quiz</h2>
          <p className="text-green-400 font-medium mb-8">{quiz?.title}</p>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❓</span>
              <span className="text-gray-300">10 questions — 15 seconds to answer each one</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <span className="text-gray-300"><strong className="text-white">Speed matters</strong> — faster correct answers score more points</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <span className="text-gray-300">You can only play once per day</span>
            </div>
          </div>

          <button
            onClick={() => setGameState('countdown')}
            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-lg rounded-xl transition"
          >
            Start Quiz →
          </button>
        </div>
      </main>
    )
  }

  if (gameState === 'countdown') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl font-bold text-green-400 animate-pulse">
            {countdown === 0 ? 'Go!' : countdown}
          </div>
        </div>
      </main>
    )
  }

  if (gameState === 'calculating') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-gray-400">Calculating your results...</p>
        </div>
      </main>
    )
  }

  if (gameState === 'no-quiz') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-2xl font-bold mb-2">No Quiz Today Yet</h2>
          <p className="text-gray-400 mb-6">Check back soon — today's quiz is on its way.</p>
          <Link href="/" className="text-green-400 hover:text-green-300">← Back to home</Link>
        </div>
      </main>
    )
  }

  if (gameState === 'already-played') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Already Played Today</h2>
          <p className="text-gray-400 mb-6">Come back tomorrow for a new quiz.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/leaderboard" className="px-6 py-2 bg-green-500 text-black font-bold rounded-lg">View Leaderboard</Link>
            <Link href="/" className="px-6 py-2 bg-gray-800 text-white rounded-lg">Home</Link>
          </div>
        </div>
      </main>
    )
  }

  if (gameState === 'finished') {
    return (
      <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-gray-400">Here's how you did today</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6 text-center">
            <div className="text-6xl font-bold text-green-400 mb-2">{finalScore}/10</div>
            <p className="text-gray-400">Correct answers</p>
          </div>

          {!user && (
            <div className="relative mb-6">
              <div className="blur-sm pointer-events-none space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">32s</div>
                    <div className="text-gray-400 text-sm">Time taken</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">868</div>
                    <div className="text-gray-400 text-sm">Total points</div>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="text-sm font-medium mb-3">Answer Breakdown</div>
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-gray-800 rounded mb-2"/>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 text-center shadow-xl mx-2">
                  <p className="text-green-400 font-bold text-lg mb-1">You scored {finalScore}/10</p>
                  <p className="text-gray-400 text-sm mb-4">See your full stats, get ranked and find out which you got wrong.</p>
                  <Link
                    href={`/join?score=${finalScore}`}
                    className="block w-full text-center px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition"
                  >
                    Reveal My Stats →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {user && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{finalTime}s</div>
                  <div className="text-gray-400 text-sm">Time taken</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{finalPoints}</div>
                  <div className="text-gray-400 text-sm">Total points</div>
                </div>
              </div>

              {isPremium && myRank && (
                <div className="bg-green-900/20 border border-green-700 rounded-2xl p-6 mb-6 text-center">
                  <p className="text-green-400 text-sm font-medium mb-1">Your Current Rank</p>
                  <div className="text-4xl font-bold">#{myRank}</div>
                  <p className="text-gray-400 text-sm mt-1">out of {totalPlayers} players today</p>
                  <p className="text-gray-500 text-xs mt-1">Updates live as more people play</p>
                </div>
              )}

              {!isPremium && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6 text-center">
                  <p className="text-gray-400 text-sm mb-3">Want to see where you ranked today?</p>
                  <Link href="/premium" className="inline-block px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg text-sm transition">
                    Upgrade to Premium — £2.99/mo
                  </Link>
                </div>
              )}

              {newBadges.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-2xl p-5 mb-6">
                  <p className="text-yellow-400 font-bold mb-3">🎉 New Badge{newBadges.length > 1 ? 's' : ''} Earned!</p>
                  <div className="flex flex-wrap gap-2">
                    {newBadges.map(badge => (
                      <span key={badge} className="bg-yellow-900/40 text-yellow-400 px-3 py-1 rounded-full text-sm capitalize">{badge.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <h3 className="font-bold mb-4">Answer Breakdown</h3>
                <div className="space-y-3">
                  {answeredQuestions.map((q, i) => (
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
            </>
          )}

          <div className="flex gap-3">
            <Link href="/leaderboard" className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition text-center">
              Leaderboard
            </Link>
            <Link href={user ? "/profile" : "/"} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-center">
              {user ? 'My Profile' : 'Home'}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const question = questions[currentQuestion]
  const options = ['A', 'B', 'C', 'D']

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-green-400 font-bold text-lg">SportingIQ</Link>
          <div className="text-gray-400 text-sm">{currentQuestion + 1} / {questions.length}</div>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="flex justify-end mb-6">
          <div className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-green-400'}`}>
            {timeLeft}s
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          {question?.image_url && (
            <img src={question.image_url} alt="Question" className="w-full rounded-xl mb-4 object-cover max-h-48" />
          )}
          <p className="text-xl font-semibold leading-relaxed">{question?.question_text}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={answered}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ${
                answered && option === selectedAnswer
                  ? 'bg-gray-700 border-gray-500'
                  : answered
                  ? 'bg-gray-800 border-gray-700 opacity-50'
                  : 'bg-gray-800 border-gray-700 hover:border-green-500 cursor-pointer'
              }`}
            >
              <span className="font-bold text-green-400 mr-3">{option}</span>
              {question && (() => {
                const map: any = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d }
                return map[option]
              })()}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
