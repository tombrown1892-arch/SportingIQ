import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
	// Verify this is called from Vercel cron
	const authHeader = request.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		// Get yesterday's date since we run at midnight
		const yesterday = new Date()
		yesterday.setDate(yesterday.getDate() - 1)
		const yesterdayStr = yesterday.toISOString().split('T')[0]

		// Get yesterday's quiz
		const { data: quiz } = await supabase
			.from('quizzes')
			.select('id')
			.eq('quiz_date', yesterdayStr)
			.single()

		if (!quiz) {
			return NextResponse.json({ message: 'No quiz found for yesterday' })
		}

		// Get final leaderboard for yesterday
		const { data: results } = await supabase
			.from('quiz_results')
			.select('user_id, total_points')
			.eq('quiz_id', quiz.id)
			.order('total_points', { ascending: false })

		if (!results || results.length === 0) {
			return NextResponse.json({ message: 'No results found' })
		}

		// Award champion badge to 1st place
		const champion = results[0]
		await supabase
			.from('badges')
			.upsert({ user_id: champion.user_id, badge_type: 'champion' }, { onConflict: 'user_id,badge_type' })

		// Award elite badge to top 10
		const top10 = results.slice(0, 10)
		for (const result of top10) {
			await supabase
				.from('badges')
				.upsert({ user_id: result.user_id, badge_type: 'elite' }, { onConflict: 'user_id,badge_type' })
		}

		return NextResponse.json({ 
			message: 'Badges awarded successfully',
			champion: champion.user_id,
			elite_count: top10.length
		})

	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}
