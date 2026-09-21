'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'Liverpool1892@Tom.Brown2003'

const emptyQuestion = {
  question_text: '',
  image_url: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  order_number: 1,
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const

// Shuffles the four options into a random order and returns the new option
// positions along with the letter the correct answer landed on.
function shuffleOptionPositions(optionA: string, optionB: string, optionC: string, optionD: string, correctAnswer: string) {
  const options = [
    { letter: 'A', text: optionA },
    { letter: 'B', text: optionB },
    { letter: 'C', text: optionC },
    { letter: 'D', text: optionD },
  ]

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }

  const newCorrectIndex = options.findIndex(o => o.letter === correctAnswer)

  return {
    option_a: options[0].text,
    option_b: options[1].text,
    option_c: options[2].text,
    option_d: options[3].text,
    correct_answer: OPTION_LETTERS[newCorrectIndex],
  }
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [activeSection, setActiveSection] = useState<'quiz' | 'cup'>('quiz')
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDate, setQuizDate] = useState(new Date().toISOString().split('T')[0])
  const [questions, setQuestions] = useState(
    Array.from({ length: 10 }, (_, i) => ({ ...emptyQuestion, order_number: i + 1 }))
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [cupQuestionsInput, setCupQuestionsInput] = useState('')
  const [cupImporting, setCupImporting] = useState(false)
  const [cupMessage, setCupMessage] = useState('')
  const [cupQuestionCount, setCupQuestionCount] = useState<number | null>(null)

  useEffect(() => {
    if (authenticated) {
      loadCupQuestionCount()
    }
  }, [authenticated])

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true)
    } else {
      setPasswordError('Incorrect password')
    }
  }

  const loadCupQuestionCount = async () => {
    const { count, error } = await supabase
      .from('cup_questions')
      .select('*', { count: 'exact', head: true })

    if (!error) {
      setCupQuestionCount(count ?? 0)
    }
  }

  const handleCupImport = async () => {
    setCupImporting(true)
    setCupMessage('')

    const lines = cupQuestionsInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const parsedQuestions: { question_text: string, option_a: string, option_b: string, option_c: string, option_d: string, correct_answer: string }[] = []
    const invalidLines: number[] = []

    lines.forEach((line, i) => {
      const parts = line.split('|').map(p => p.trim())
      const [question_text, option_a, option_b, option_c, option_d, correctAnswerRaw] = parts
      const correct_answer = (correctAnswerRaw || '').toUpperCase()

      if (
        parts.length !== 6 ||
        !question_text || !option_a || !option_b || !option_c || !option_d ||
        !['A', 'B', 'C', 'D'].includes(correct_answer)
      ) {
        invalidLines.push(i + 1)
        return
      }

      const shuffled = shuffleOptionPositions(option_a, option_b, option_c, option_d, correct_answer)
      parsedQuestions.push({ question_text, ...shuffled })
    })

    if (parsedQuestions.length === 0) {
      setCupMessage('Error: No valid questions found. Check the pipe-separated format.')
      setCupImporting(false)
      return
    }

    const { error } = await supabase.from('cup_questions').insert(parsedQuestions)

    if (error) {
      setCupMessage('Error: ' + error.message)
      setCupImporting(false)
      return
    }

    const successMsg = `Imported ${parsedQuestions.length} question${parsedQuestions.length === 1 ? '' : 's'} successfully!`
    const skippedMsg = invalidLines.length > 0
      ? ` Skipped ${invalidLines.length} invalid line${invalidLines.length === 1 ? '' : 's'} (line${invalidLines.length === 1 ? '' : 's'} ${invalidLines.join(', ')}).`
      : ''

    setCupMessage(successMsg + skippedMsg)
    setCupQuestionsInput('')
    setCupImporting(false)
    loadCupQuestionCount()
  }

  const updateQuestion = (index: number, field: string, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .insert({ title: quizTitle, quiz_date: quizDate, is_active: true })
      .select()
      .single()

    if (quizError) {
      setMessage('Error: ' + quizError.message)
      setSaving(false)
      return
    }

    const questionsToInsert = questions.map(q => ({
      ...q,
      quiz_id: quizData.id,
      image_url: q.image_url || null,
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      setMessage('Error: ' + questionsError.message)
      setSaving(false)
      return
    }

    setMessage('Quiz saved successfully!')
    setSaving(false)
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-green-400 mb-8 text-center">Admin Access</h1>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 mb-4"
              placeholder="Enter admin password"
            />
            {passwordError && <p className="text-red-400 text-sm mb-4">{passwordError}</p>}
            <button
              onClick={handlePasswordSubmit}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition"
            >
              Enter
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-green-400 mb-6">Admin</h1>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveSection('quiz')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeSection === 'quiz'
                ? 'bg-green-500 text-black'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Daily Quiz
          </button>
          <button
            onClick={() => setActiveSection('cup')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeSection === 'cup'
                ? 'bg-green-500 text-black'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Cup Questions
          </button>
        </div>

        {activeSection === 'cup' && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Bulk Import Cup Questions</h2>
                <span className="text-sm text-gray-400">
                  {cupQuestionCount === null ? 'Loading count...' : `${cupQuestionCount} question${cupQuestionCount === 1 ? '' : 's'} in bank`}
                </span>
              </div>

              <label className="text-sm text-gray-400 mb-1 block">
                One question per line: Question text | Option A | Option B | Option C | Option D | Correct Answer (A, B, C or D)
              </label>
              <textarea
                value={cupQuestionsInput}
                onChange={(e) => setCupQuestionsInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 font-mono text-sm"
                placeholder={'Who won the 2022 World Cup? | Argentina | France | Brazil | Croatia | A'}
                rows={12}
              />

              {cupMessage && (
                <p className={`text-sm mt-4 ${cupMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {cupMessage}
                </p>
              )}

              <button
                onClick={handleCupImport}
                disabled={cupImporting || !cupQuestionsInput.trim()}
                className="w-full mt-4 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition disabled:opacity-50 text-lg"
              >
                {cupImporting ? 'Importing...' : 'Import Questions'}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'quiz' && (
        <>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Quiz Title</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="Daily Sports Quiz - May 29"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Quiz Date</label>
              <input
                type="date"
                value={quizDate}
                onChange={(e) => setQuizDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {questions.map((q, index) => (
          <div key={index} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
            <h3 className="text-green-400 font-semibold mb-4">Question {index + 1}</h3>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Question Text</label>
              <textarea
                value={q.question_text}
                onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="Enter your question here..."
                rows={2}
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Image URL (optional)</label>
              <input
                type="text"
                value={q.image_url}
                onChange={(e) => updateQuestion(index, 'image_url', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {['a', 'b', 'c', 'd'].map((opt) => (
                <div key={opt}>
                  <label className="text-sm text-gray-400 mb-1 block">Option {opt.toUpperCase()}</label>
                  <input
                    type="text"
                    value={q[`option_${opt}` as keyof typeof q]}
                    onChange={(e) => updateQuestion(index, `option_${opt}`, e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    placeholder={`Option ${opt.toUpperCase()}`}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Correct Answer</label>
              <select
                value={q.correct_answer}
                onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        ))}

        {message && (
          <p className={`text-sm mb-4 ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition disabled:opacity-50 text-lg"
        >
          {saving ? 'Saving Quiz...' : 'Save & Publish Quiz'}
        </button>
        </>
        )}
      </div>
    </main>
  )
}