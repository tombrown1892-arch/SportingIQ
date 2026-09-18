import CupLeaderboard from '@/app/components/CupLeaderboard'

export default function CupLeaderboardPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Cup Leaderboard</h1>
        <p className="text-gray-400 mb-6">See how you stack up in the FootyGames Cup</p>
        <CupLeaderboard />
      </div>
    </main>
  )
}
