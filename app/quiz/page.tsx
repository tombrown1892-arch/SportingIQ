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
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [totalTime, setTotalTime] = useState(0)
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'no-quiz' | 'already-played'>('loading')
  const [user, setUser] = useState<any>(null)
  const [finalScore, setFinalScore] = useState(0)
  const [finalPoints, setFinalPoints] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState<{question: string, selected: string | null, correct: string}[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scoreRef = useRef(0)
  const answeredQuestionsRef = useRef<{question: string, selected: string | null, correct: string}[]>([])

  useEffect(() => {
    loadQuiz()
  }, [])

  useEffect(() => {
    if (gameState === 'playing') {
      totalTimerRef.current = setInterval(() => {
        setTotalTime(t => t + 1)
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

  const loadQuiz = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

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
      setGameState('playing')
    }
  }

  const handleAnswer = (answer: string | null) => {
    if (answered) return
    if (timerRef.current) clearInterval(timerRef.current)
    setAnswered(true)
    setSelectedAnswer(answer)

    const currentQ = questions[currentQuestion]
    answeredQuestionsRef.current = [...answeredQuestionsRef.current, {
      question: currentQ?.question_text,
      selected: answer,
      correct: currentQ?.correct_answer
    }]

    if (answer === currentQ?.correct_answer) {
      scoreRef.current = scoreRef.current + 1
      setScore(scoreRef.current)
    }

    setTimeout(() => {
      if (currentQuestion + 1 >= questions.length) {
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
    const timeBonus = Math.max(0, 300 - totalTime)
    const tp = (fs * 100) + timeBonus

    setFinalScore(fs)
    setFinalPoints(tp)
    setAnsweredQuestions(answeredQuestionsRef.current)
    setGameState('finished')

    if (user && quiz) {
      await supabase.from('quiz_results').insert({
        user_id: user.id,
        quiz_id: quiz.id,
        score: fs,
        time_seconds: totalTime,
        total_points: tp,
      })

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
          .update({
            streak: newStreak,
            longest_streak: newLongest,
            last_played: today,
          })
          .eq('id', user.id)
      }

      await checkAndAwardBadges(user.id, {
        score: fs,
        time_seconds: totalTime,
        total_points: tp,
        quiz_id: quiz.id,
      })
    }
  }

  const getAnswerStyle = (option: string) => {
    if (!answered) return 'bg-gray-800 border-gray-700 hover:border-green-500 hover:bg-gray-750 cursor-pointer'
    if (option === questions[currentQuestion]?.correct_answer) return 'bg-green-900 border-green-500'
    if (option === selectedAnswer && option !== questions[currentQuestion]?.correct_answer) return 'bg-red-900 border-red-500'
    return 'bg-gray-800 border-gray-700 opacity-50'
  }

  const getOptionLabel = (key: string, question: Question) => {
    const map: any = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d }
    return map[key]
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
            <Link href="/leaderboard" className="px-6 py-2 bg-green-500 text-black font-bold rounded-lg">
              View Leaderboard
            </Link>
            <Link href="/" className="px-6 py-2 bg-gray-800 text-white rounded-lg">
              Home
            </Link>
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

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
            <div className="text-6xl font-bold text-green-400 text-center mb-2">{finalScore}/10</div>
            <p className="text-gray-400 text-center mb-6">Correct answers</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{totalTime}s</div>
                <div className="text-gray-400">Time taken</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{finalPoints}</div>
                <div className="text-gray-400">Total points</div>
              </div>
            </div>
          </div>

          {!user && (
            <div className="bg-green-900/30 border border-green-800 rounded-xl p-6 mb-6">
              <p className="text-green-400 font-semibold mb-1">Want to know how you ranked?</p>
              <p className="text-gray-400 text-sm mb-4">Sign up free to get ranked on the leaderboard and see which questions you got wrong.</p>
              <Link href="/signup" className="block w-full text-center px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition">
                Sign Up Free
              </Link>
              <Link href="/premium" className="block w-full text-center px-6 py-2 text-green-400 hover:text-green-300 text-sm mt-2">
                Or go Premium for full leaderboard access →
              </Link>
            </div>
          )}

          {user && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="font-bold mb-4">Answer Breakdown</h3>
              <div className="space-y-3">
                {answeredQuestions.map((q, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm ${q.selected === q.correct ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
                    <div className="font-medium mb-1">{q.question}</div>
                    <div className="text-gray-400">
                      Your answer: <span className={q.selected === q.correct ? 'text-green-400' : 'text-red-400'}>{q.selected || 'No answer'}</span>
                      {q.selected !== q.correct && <span className="text-green-400 ml-2">✓ {q.correct}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">Score: <span className="text-white font-semibold">{score}</span></div>
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
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ${getAnswerStyle(option)}`}
            >
              <span className="font-bold text-green-400 mr-3">{option}</span>
              {getOptionLabel(option, question)}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
