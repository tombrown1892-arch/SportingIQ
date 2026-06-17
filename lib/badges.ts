import { supabase } from './supabase'

export const BADGES = {
  ON_FIRE: { id: 'on_fire', name: 'On Fire', emoji: '🔥', description: '7 day streak' },
  DIAMOND: { id: 'diamond', name: 'Diamond', emoji: '💎', description: '30 day streak' },
  PERFECT: { id: 'perfect', name: 'Perfect', emoji: '⚡', description: 'Score 10/10' },
  CHAMPION: { id: 'champion', name: 'Champion', emoji: '🏆', description: 'Finish 1st on daily leaderboard' },
  SHARP_SHOOTER: { id: 'sharp_shooter', name: 'Sharp Shooter', emoji: '🎯', description: 'Complete quiz under 45 seconds with 8+ correct' },
  CENTURION: { id: 'centurion', name: 'Centurion', emoji: '📅', description: 'Play 100 quizzes' },
  ELITE: { id: 'elite', name: 'Elite', emoji: '🥇', description: 'Finish top 10 on daily leaderboard' },
  PREMIUM_MEMBER: { id: 'premium_member', name: 'Premium Member', emoji: '⭐', description: 'Premium subscriber' },
  FOUNDING_MEMBER: { id: 'founding_member', name: 'Founding Member', emoji: '🎖️', description: 'Signed up in the first 3 months' },
}

export async function checkAndAwardBadges(userId: string, quizResult: {
  score: number
  time_seconds: number
  total_points: number
  quiz_id: string
}) {
  const badgesToAward: string[] = []

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak, is_premium, created_at')
    .eq('id', userId)
    .single()

  if (!profile) return

  const { count: totalQuizzes } = await supabase
    .from('quiz_results')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)

  // Streak badges
  if (profile.streak >= 7) badgesToAward.push(BADGES.ON_FIRE.id)
  if (profile.streak >= 30) badgesToAward.push(BADGES.DIAMOND.id)

  // Perfect score
  if (quizResult.score === 10) badgesToAward.push(BADGES.PERFECT.id)

  // Sharp shooter — under 45 seconds with 8+ correct
  if (quizResult.time_seconds <= 45 && quizResult.score >= 8) {
    badgesToAward.push(BADGES.SHARP_SHOOTER.id)
  }

  // Centurion
  if (totalQuizzes && totalQuizzes >= 100) badgesToAward.push(BADGES.CENTURION.id)

  // Premium member
  if (profile.is_premium) badgesToAward.push(BADGES.PREMIUM_MEMBER.id)

  // Founding member — signed up before September 2026
  const signupDate = new Date(profile.created_at)
  const foundingCutoff = new Date('2026-09-01')
  if (signupDate < foundingCutoff) badgesToAward.push(BADGES.FOUNDING_MEMBER.id)

  // Champion and Elite are awarded by the midnight cron job — not here

  for (const badgeType of badgesToAward) {
    await supabase
      .from('badges')
      .upsert({ user_id: userId, badge_type: badgeType }, { onConflict: 'user_id,badge_type' })
  }
}
