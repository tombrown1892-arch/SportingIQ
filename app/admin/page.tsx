'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function AdminPage() {
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDate, setQuizDate] = useState(new Date().toISOString().split('T')[0])
  const [questions, setQuestions] = useState(
    Array.from({ length: 10 }, (_, i) => ({ ...emptyQuestion, order_number: i + 1 }))
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-green-400 mb-8">Admin — Create Quiz</h1>

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
      </div>
    </main>
  )
}
