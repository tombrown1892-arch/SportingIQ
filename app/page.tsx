import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-400">SportingIQ</h1>
            <p className="text-gray-400 text-xs">Test your sporting knowledge</p>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
              Login
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition">
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-block bg-green-500/10 text-green-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
          Daily Quiz Live Now
        </div>
        <h2 className="text-5xl font-bold mb-6 leading-tight">
          How good is your<br />
          <span className="text-green-400">Sporting IQ?</span>
        </h2>
        <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
          Take today's daily sports quiz, build your streak, and compete on the leaderboard against thousands of fans.
        </p>
        <Link href="/quiz" className="inline-block px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-lg rounded-xl transition">
          Take Today's Quiz →
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-3xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold mb-2">Daily Leaderboard</h3>
          <p className="text-gray-400 text-sm">Compete against thousands of sports fans every day. See where you rank.</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-3xl mb-4">🔥</div>
          <h3 className="text-lg font-semibold mb-2">Build Your Streak</h3>
          <p className="text-gray-400 text-sm">Play every day to build your streak. Don't break the chain.</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold mb-2">Speed Matters</h3>
          <p className="text-gray-400 text-sm">Score points for correct answers but bonus points for being fast.</p>
        </div>
      </section>

      {/* Premium CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-green-900/40 to-gray-900 border border-green-800 rounded-2xl p-10 text-center">
          <h3 className="text-2xl font-bold mb-3">Go Premium</h3>
          <p className="text-gray-400 mb-6">Unlock full leaderboards, bonus quizzes, badges and an ad-free experience.</p>
          <div className="text-4xl font-bold text-green-400 mb-2">£2.99<span className="text-lg text-gray-400 font-normal">/month</span></div>
          <p className="text-gray-500 text-sm mb-8">or £19.99/year — save 44%</p>
          <Link href="/signup" className="inline-block px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition">
            Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        © 2026 SportingIQ. All rights reserved.
      </footer>
    </main>
  )
}
