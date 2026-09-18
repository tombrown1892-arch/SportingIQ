'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
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

interface MatchEvent {
  minute: number
  type: 'player' | 'opposition'
  resolved: boolean
}

interface ShootoutKick {
  taker: 'player' | 'opposition'
  scored: boolean
}

interface RoundConfig {
  name: string
  timeLimit: number
  playerChanceProb: number
  pool: string[]
}

type CommentaryType = 'goal' | 'concede' | 'attack' | 'defense' | 'general' | 'miss' | 'header'

interface CommentaryLine {
  text: string
  type: CommentaryType
  badge: string
}

interface Fixture {
  home: string
  away: string
  htHome: number
  htAway: number
  ftHome: number
  ftAway: number
}

interface HalfTimeStats {
  yourShots: number
  theirShots: number
  yourPossession: number
  theirPossession: number
  yourCorners: number
  theirCorners: number
  yourGoals: number
  theirGoals: number
}

const LEAGUE_ONE_TWO = ['Wrexham', 'Bolton Wanderers', 'Portsmouth', 'Barnsley', 'Stockport County', 'Wycombe Wanderers', 'Peterborough United', 'Blackpool', 'Leyton Orient', 'Mansfield Town', 'Cambridge United', 'Northampton Town']
const CHAMPIONSHIP = ['Leeds United', 'Sunderland', 'West Bromwich Albion', 'Norwich City', 'Middlesbrough', 'Coventry City', 'Sheffield Wednesday', 'Watford', 'Hull City', 'Preston North End', 'Millwall', 'Swansea City']
const LOWER_PL = ['Everton', 'Wolverhampton Wanderers', 'Crystal Palace', 'Fulham', 'Brentford', 'Bournemouth', 'Nottingham Forest', 'Leicester City', 'Southampton', 'Ipswich Town']
const MID_PL = ['West Ham United', 'Newcastle United', 'Aston Villa', 'Brighton & Hove Albion', 'Fulham', 'Bournemouth', 'Nottingham Forest']
const TOP_SIX = ['Manchester City', 'Manchester United', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham Hotspur']

const ROUNDS: RoundConfig[] = [
  { name: 'Round 1', timeLimit: 20, playerChanceProb: 0.75, pool: LEAGUE_ONE_TWO },
  { name: 'Round 2', timeLimit: 17, playerChanceProb: 0.65, pool: CHAMPIONSHIP },
  { name: 'Quarter Final', timeLimit: 14, playerChanceProb: 0.55, pool: LOWER_PL },
  { name: 'Semi Final', timeLimit: 11, playerChanceProb: 0.50, pool: MID_PL },
  { name: 'Final', timeLimit: 8, playerChanceProb: 0.45, pool: TOP_SIX },
]

const SHOOTOUT_TIME = 8
const DEFAULT_TEAM_NAME = 'My Team'
const CLOCK_TICK_MS = 250 // master interval driving the match minute, events and general commentary

const GENERAL_COMMENTARY = [
  '🟨 Yellow card shown to their captain!',
  '💨 VAR checking a potential penalty...',
  '🔥 The atmosphere is electric!',
  '⚡ End to end action now!',
  '🎯 So close! Hit the crossbar!',
  '🌊 Wave of pressure from your team!',
  '😤 The manager is not happy on the touchline!',
  '📢 The crowd is going wild!',
  '🟨 Yellow card shown for a late challenge!',
  '🚩 Offside flag goes up!',
  '🧊 Ice cool defending there!',
  '🔄 A substitution is being made!',
  '⛳ Corner kick won!',
  '🦵 A crunching tackle wins the ball back!',
  '🗣️ The manager shouts instructions from the touchline!',
  '🩹 The physio is called on for a knock!',
  '🎺 Chants ring out around the stadium!',
  '🎳 A speculative long-range effort flies well wide!',
  '🔁 Possession being patiently worked around the back!',
  '💪 A crunching 50-50 challenge in midfield!',
  '⏳ Time being wasted at the goal kick!',
  '📈 The tension is building as the game goes on!',
  '🧱 A dangerous ball whipped into the box, but it is cleared!',
  '🎇 What a moment this is turning into!',
  '🥅 The keeper takes his time with a goal kick!',
  '🌪️ Both sides going end to end!',
  '🧤 A brilliant flying save keeps it level!',
  '🏟️ You could hear a pin drop in the stadium!',
  '🎭 Drama unfolding out on the pitch!',
  '🚦 Play is held up for a minor injury!',
  '🧭 The tactics board is out on the touchline!',
  '🎢 What a rollercoaster this match is!',
]

const ATTACKING_LINES = [
  '⚡ Great ball over the top! Your striker is through on goal!',
  '🎯 Your winger cuts inside and shoots!',
  '🚀 Corner swung in — your centre back attacks it!',
  '🔥 Your midfielder drives forward — he shoots!',
  '💥 One on one with the keeper — this could be the goal!',
  '✂️ A defence-splitting pass sets up the chance!',
  '🎪 Free kick in a dangerous position — over the wall!',
  '👟 Your striker nips in behind the last defender!',
  '🌟 A driven low cross begs to be turned in!',
  '🏃 Space opens up on the edge of the box!',
  '🎯 The through ball is perfectly weighted — your striker is clean through!',
  '⚡ Brilliant one-two on the edge of the box!',
  '🌟 What a run! He\'s beaten three men and he\'s in on goal!',
  '🔥 The cross comes in perfectly — your striker attacks it!',
  '💫 Sublime skill to create space — he shoots!',
  '🎩 A cheeky flick sends your striker clean through!',
]

const DEFENSIVE_LINES = [
  '🛡️ Their striker breaks free — your keeper must be alert!',
  '😰 Dangerous cross into your box!',
  '⚠️ They win a corner — all hands on deck!',
  '🧨 Their midfielder unleashes a long shot!',
  '🚨 Last man tackle needed — can you stop them?',
  '💢 A quick counter-attack catches your defence square!',
  '😨 Free kick in a threatening area — set the wall!',
  '🥶 Their winger races down the flank and cuts inside!',
  '🔒 A loose ball falls to their striker in the box!',
  '😬 They break forward three-on-two — danger!',
  '😰 Their striker has got in behind — this looks dangerous!',
  '🚨 DANGER! Three against two on the counter — huge chance for them!',
  '🧊 Their forward is through with only your keeper to beat!',
  '⚠️ A defensive mix-up gifts them a clear sight of goal!',
  '💣 They work a short corner — it comes back dangerous!',
  '🌩️ A speculative strike is heading for the top corner!',
]

function commentaryRowClasses(type: CommentaryType): { row: string, badge: string, text: string } {
  switch (type) {
    case 'goal': return { row: 'bg-green-900/25', badge: 'bg-green-500 text-black', text: 'text-sm text-green-400 font-bold' }
    case 'concede': return { row: 'bg-red-900/25', badge: 'bg-red-500 text-black', text: 'text-sm text-red-400 font-bold' }
    case 'attack': return { row: '', badge: 'bg-amber-500/80 text-black', text: 'text-sm text-amber-400' }
    case 'defense': return { row: '', badge: 'bg-orange-500/80 text-black', text: 'text-sm text-orange-400' }
    case 'miss': return { row: '', badge: 'bg-gray-700 text-gray-300', text: 'text-sm text-gray-500 line-through decoration-gray-600' }
    case 'header': return { row: 'bg-white/5', badge: 'bg-white text-black', text: 'text-sm text-white font-bold' }
    case 'general': return { row: '', badge: 'bg-gray-800 text-gray-500', text: 'text-xs text-gray-500' }
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]
}

function pickOpponent(pool: string[]): string {
  return pickRandom(pool)
}

// 5-8 events, minutes 5-85, no two within 5 minutes of each other, never on minute 45 (half time)
function buildMatchEvents(playerChanceProb: number): MatchEvent[] {
  const count = 5 + Math.floor(Math.random() * 4) // 5-8
  const minutes: number[] = []
  let attempts = 0
  while (minutes.length < count && attempts < 500) {
    attempts++
    const candidate = 5 + Math.floor(Math.random() * 81) // 5-85
    if (candidate === 45) continue
    if (minutes.every(m => Math.abs(m - candidate) >= 5)) {
      minutes.push(candidate)
    }
  }
  minutes.sort((a, b) => a - b)
  return minutes.map(minute => ({
    minute,
    type: Math.random() < playerChanceProb ? 'player' : 'opposition',
    resolved: false,
  }))
}

// 8-12 general commentary minutes, 3-88, at least 4 apart, never on an event minute or minute 45
function buildGeneralMinutes(eventMinutes: number[]): number[] {
  const count = 8 + Math.floor(Math.random() * 5) // 8-12
  const minutes: number[] = []
  let attempts = 0
  while (minutes.length < count && attempts < 800) {
    attempts++
    const candidate = 3 + Math.floor(Math.random() * 86) // 3-88
    if (candidate === 45 || eventMinutes.includes(candidate)) continue
    if (minutes.every(m => Math.abs(m - candidate) >= 4)) {
      minutes.push(candidate)
    }
  }
  return minutes.sort((a, b) => a - b)
}

function randomFixtureCount(): number {
  return 3 + Math.floor(Math.random() * 2) // 3-4
}

function generateFixtures(pool: string[], exclude: string, count: number): Fixture[] {
  const candidates = shuffle(pool.filter(t => t !== exclude))
  const fixtures: Fixture[] = []
  for (let i = 0; i + 1 < candidates.length && fixtures.length < count; i += 2) {
    const htHome = Math.floor(Math.random() * 2) // 0-1
    const htAway = Math.floor(Math.random() * 2) // 0-1
    const ftHome = htHome + Math.floor(Math.random() * 2) // +0-1 in the second half
    const ftAway = htAway + Math.floor(Math.random() * 2) // +0-1 in the second half
    fixtures.push({ home: candidates[i], away: candidates[i + 1], htHome, htAway, ftHome, ftAway })
  }
  return fixtures
}

function randomPossession(roundIdx: number): number {
  const center = 60 - roundIdx * 2.5
  const val = Math.round(center + (Math.random() * 10 - 5))
  return Math.min(68, Math.max(38, val))
}

function randomCorners(): number {
  return 2 + Math.floor(Math.random() * 4) // 2-5
}

export default function CupPage() {
  const [gameState, setGameState] = useState<'loading' | 'team-name' | 'pre-match' | 'playing' | 'shootout' | 'round-result' | 'cup-won' | 'cup-lost'>('loading')
  const [user, setUser] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [hasQuestions, setHasQuestions] = useState(false)
  const [teamName, setTeamName] = useState('')

  const [roundIndex, setRoundIndex] = useState(0)
  const roundIndexRef = useRef(0)
  const [opponent, setOpponent] = useState('')
  const opponentRef = useRef('')
  const [playerScore, setPlayerScore] = useState(0)
  const playerScoreRef = useRef(0)
  const [oppScore, setOppScore] = useState(0)
  const oppScoreRef = useRef(0)
  const [matchMinute, setMatchMinute] = useState(0)
  const matchMinuteRef = useRef(0)
  const [commentary, setCommentary] = useState<CommentaryLine[]>([])
  const usedAttackingRef = useRef<string[]>([])
  const usedDefensiveRef = useRef<string[]>([])
  const usedGeneralRef = useRef<string[]>([])
  const [resultBanner, setResultBanner] = useState<string | null>(null)
  const [guestStats, setGuestStats] = useState<{ gamesPlayed: number, cupsWon: number, bestRound: number } | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [wonOnPens, setWonOnPens] = useState(false)
  const [halfTimeStats, setHalfTimeStats] = useState<HalfTimeStats | null>(null)
  const playerShotsRef = useRef(0)
  const oppShotsRef = useRef(0)

  const totalGoalsScoredRef = useRef(0)
  const totalGoalsConcededRef = useRef(0)
  const correctAnswersRef = useRef(0)
  const incorrectAnswersRef = useRef(0)
  const [finalStats, setFinalStats] = useState({ goalsScored: 0, goalsConceded: 0, correct: 0, incorrect: 0 })

  const eventsRef = useRef<MatchEvent[]>([])
  const generalMinutesRef = useRef<number[]>([])
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const questionPoolRef = useRef<Question[]>([])
  const poolIndexRef = useRef(0)

  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null)
  const activeQuestionRef = useRef<Question | null>(null)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0)
  const [questionAnswered, setQuestionAnswered] = useState(false)
  const questionAnsweredRef = useRef(false)
  const [questionSelected, setQuestionSelected] = useState<string | null>(null)
  const onResolveRef = useRef<((correct: boolean) => void) | null>(null)
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [shootoutKicks, setShootoutKicks] = useState<ShootoutKick[]>([])
  const shootoutKicksRef = useRef<ShootoutKick[]>([])

  const [activeEventType, setActiveEventType] = useState<'player' | 'opposition' | null>(null)
  const [flash, setFlash] = useState<'goal' | 'concede' | null>(null)
  const [buildup, setBuildup] = useState<{ text: string, type: 'player' | 'opposition' } | null>(null)
  const [halfTime, setHalfTime] = useState(false)
  const halfTimeShownRef = useRef(false)
  const roundResultAdvancedRef = useRef(false)

  useEffect(() => {
    loadCup()
    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
      if (questionTimerRef.current) clearInterval(questionTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (gameState === 'round-result') {
      roundResultAdvancedRef.current = false
    }
  }, [gameState])

  const pickUnused = (pool: string[], usedRef: { current: string[] }): string => {
    let available = pool.filter(l => !usedRef.current.includes(l))
    if (available.length === 0) {
      usedRef.current = []
      available = pool
    }
    const line = pickRandom(available)
    usedRef.current = [...usedRef.current, line]
    return line
  }

  const loadCup = async () => {
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
      setGameState('team-name')
      return
    }
    setQuiz(quizData)

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('order_number')

    if (questionsData && questionsData.length > 0) {
      questionPoolRef.current = shuffle(questionsData)
      poolIndexRef.current = 0
      setHasQuestions(true)
    }

    setGameState('team-name')
  }

  const getNextQuestion = (): Question => {
    if (poolIndexRef.current >= questionPoolRef.current.length) {
      questionPoolRef.current = shuffle(questionPoolRef.current)
      poolIndexRef.current = 0
    }
    const q = questionPoolRef.current[poolIndexRef.current]
    poolIndexRef.current += 1
    return q
  }

  const pushCommentary = (text: string, type: CommentaryType, badge: string) => {
    setCommentary(c => [{ text, type, badge }, ...c])
  }

  const askQuestion = (question: Question, timeLimit: number, onResolve: (correct: boolean) => void) => {
    activeQuestionRef.current = question
    setActiveQuestion(question)
    questionAnsweredRef.current = false
    setQuestionAnswered(false)
    setQuestionSelected(null)
    setQuestionTimeLeft(timeLimit)
    onResolveRef.current = onResolve
    if (questionTimerRef.current) clearInterval(questionTimerRef.current)
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft(t => {
        if (t <= 1) {
          clearInterval(questionTimerRef.current!)
          submitAnswer(null)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  const submitAnswer = (answer: string | null) => {
    if (questionAnsweredRef.current) return
    questionAnsweredRef.current = true
    setQuestionAnswered(true)
    setQuestionSelected(answer)
    if (questionTimerRef.current) clearInterval(questionTimerRef.current)
    const q = activeQuestionRef.current
    const correct = !!q && answer === q.correct_answer
    if (correct) {
      correctAnswersRef.current += 1
    } else {
      incorrectAnswersRef.current += 1
    }
    const resolve = onResolveRef.current
    setTimeout(() => {
      setActiveQuestion(null)
      activeQuestionRef.current = null
      resolve?.(correct)
    }, 1200)
  }

  // ---- Match (regulation) ----

  const prepareRound = (idx: number) => {
    const round = ROUNDS[idx]
    const opp = pickOpponent(round.pool)
    opponentRef.current = opp
    setOpponent(opp)
    setFixtures(generateFixtures(round.pool, opp, randomFixtureCount()))
    setWonOnPens(false)
    setGameState('pre-match')
  }

  const startMatch = () => {
    const round = ROUNDS[roundIndexRef.current]
    playerScoreRef.current = 0
    oppScoreRef.current = 0
    setPlayerScore(0)
    setOppScore(0)
    matchMinuteRef.current = 0
    setMatchMinute(0)
    playerShotsRef.current = 0
    oppShotsRef.current = 0

    eventsRef.current = buildMatchEvents(round.playerChanceProb)
    generalMinutesRef.current = buildGeneralMinutes(eventsRef.current.map(e => e.minute))
    usedAttackingRef.current = []
    usedDefensiveRef.current = []
    usedGeneralRef.current = []
    halfTimeShownRef.current = false

    setCommentary([{ text: `Kick-off! ${teamName} vs ${opponentRef.current} — ${round.name}`, type: 'header', badge: 'KO' }])
    setResultBanner(null)
    setFlash(null)
    setBuildup(null)
    setHalfTime(false)
    setActiveEventType(null)
    setActiveQuestion(null)
    activeQuestionRef.current = null
    setGameState('playing')
    startClock()
  }

  // Single master interval: advances matchMinute, checks for a due event, checks for
  // due general commentary, and triggers half/full time. Cleared (paused) the instant
  // a question goes up, restarted the instant it resolves — so everything driven by
  // this tick stays perfectly in sync and pauses/resumes together.
  const startClock = () => {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
    clockIntervalRef.current = setInterval(() => {
      setMatchMinute(m => {
        const next = m + 1
        matchMinuteRef.current = next

        if (next === 45 && !halfTimeShownRef.current) {
          halfTimeShownRef.current = true
          clearInterval(clockIntervalRef.current!)
          clockIntervalRef.current = null
          triggerHalfTime()
          return next
        }

        if (next >= 90) {
          clearInterval(clockIntervalRef.current!)
          clockIntervalRef.current = null
          endMatch()
          return 90
        }

        const ev = eventsRef.current.find(e => !e.resolved && e.minute === next)
        if (ev) {
          clearInterval(clockIntervalRef.current!)
          clockIntervalRef.current = null
          triggerEvent(ev)
          return next
        }

        if (generalMinutesRef.current.includes(next)) {
          pushCommentary(pickUnused(GENERAL_COMMENTARY, usedGeneralRef), 'general', '•')
        }

        return next
      })
    }, CLOCK_TICK_MS)
  }

  const triggerHalfTime = () => {
    const yourPossession = randomPossession(roundIndexRef.current)
    setHalfTimeStats({
      yourShots: playerShotsRef.current,
      theirShots: oppShotsRef.current,
      yourPossession,
      theirPossession: 100 - yourPossession,
      yourCorners: randomCorners(),
      theirCorners: randomCorners(),
      yourGoals: playerScoreRef.current,
      theirGoals: oppScoreRef.current,
    })
    setHalfTime(true)
  }

  const resumeSecondHalf = () => {
    setHalfTime(false)
    startClock()
  }

  const triggerEvent = (ev: MatchEvent) => {
    const round = ROUNDS[roundIndexRef.current]
    if (ev.type === 'player') {
      playerShotsRef.current += 1
    } else {
      oppShotsRef.current += 1
    }
    const line = ev.type === 'player'
      ? pickUnused(ATTACKING_LINES, usedAttackingRef)
      : pickUnused(DEFENSIVE_LINES, usedDefensiveRef)
    setActiveEventType(ev.type)
    setBuildup({ text: line, type: ev.type })
    pushCommentary(line, ev.type === 'player' ? 'attack' : 'defense', `${ev.minute}'`)

    setTimeout(() => {
      setBuildup(null)
      const q = getNextQuestion()
      askQuestion(q, round.timeLimit, (correct) => resolveMatchEvent(ev, correct))
    }, 900)
  }

  const resolveMatchEvent = (ev: MatchEvent, correct: boolean) => {
    let text = ''
    let flashType: 'goal' | 'concede' | null = null
    let lineType: CommentaryType = 'miss'
    if (ev.type === 'player') {
      if (correct) {
        playerScoreRef.current += 1
        setPlayerScore(playerScoreRef.current)
        totalGoalsScoredRef.current += 1
        text = `⚽ GOAL! ${teamName} score! ${teamName} ${playerScoreRef.current} - ${oppScoreRef.current} ${opponentRef.current}`
        flashType = 'goal'
        lineType = 'goal'
      } else {
        text = `❌ ${teamName}'s chance goes begging!`
      }
    } else {
      if (correct) {
        text = `🧤 SAVED! ${teamName}'s keeper denies ${opponentRef.current}!`
      } else {
        oppScoreRef.current += 1
        setOppScore(oppScoreRef.current)
        totalGoalsConcededRef.current += 1
        text = `😱 GOAL conceded! ${teamName} ${playerScoreRef.current} - ${oppScoreRef.current} ${opponentRef.current}`
        flashType = 'concede'
        lineType = 'concede'
      }
    }

    eventsRef.current = eventsRef.current.map(e => e.minute === ev.minute ? { ...e, resolved: true } : e)
    setResultBanner(text)
    setFlash(flashType)
    pushCommentary(text, lineType, `${ev.minute}'`)

    setTimeout(() => {
      setResultBanner(null)
      setFlash(null)
      startClock() // resume the master interval from where it left off
    }, 1200)
  }

  const endMatch = () => {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
    const ps = playerScoreRef.current
    const os = oppScoreRef.current

    if (ps === os) {
      initializeShootout()
    } else if (ps > os) {
      setGameState('round-result')
    } else {
      finishCup(false)
    }
  }

  const advanceRound = () => {
    roundIndexRef.current += 1
    setRoundIndex(roundIndexRef.current)
    prepareRound(roundIndexRef.current)
  }

  const proceedFromRoundResult = () => {
    if (roundResultAdvancedRef.current) return
    roundResultAdvancedRef.current = true
    if (roundIndexRef.current === ROUNDS.length - 1) {
      finishCup(true)
    } else {
      advanceRound()
    }
  }

  // ---- Penalty shootout ----

  const initializeShootout = () => {
    shootoutKicksRef.current = []
    setShootoutKicks([])
    setResultBanner(null)
    setFlash(null)
    setBuildup(null)
    pushCommentary(`Level after 90 minutes — it's going to penalties!`, 'header', 'FT')
    setGameState('shootout')
    nextShootoutKick()
  }

  const nextShootoutKick = () => {
    const kicks = shootoutKicksRef.current
    const kickNum = kicks.length

    if (kickNum % 2 === 0 && kickNum >= 10) {
      const playerScored = kicks.filter(k => k.taker === 'player' && k.scored).length
      const oppScored = kicks.filter(k => k.taker === 'opposition' && k.scored).length
      if (playerScored !== oppScored) {
        finishShootout(playerScored > oppScored)
        return
      }
    }

    const taker: 'player' | 'opposition' = kickNum % 2 === 0 ? 'player' : 'opposition'
    setActiveEventType(taker)
    const q = getNextQuestion()
    askQuestion(q, SHOOTOUT_TIME, (correct) => resolveShootoutKick(taker, correct))
  }

  const resolveShootoutKick = (taker: 'player' | 'opposition', correct: boolean) => {
    const scored = taker === 'player' ? correct : !correct
    const text = taker === 'player'
      ? (scored ? `⚽ ${teamName} score the penalty!` : `❌ ${teamName} miss!`)
      : (scored ? `😱 ${opponentRef.current} score against ${teamName}!` : `🧤 SAVED! ${teamName} keep it out!`)
    const flashType: 'goal' | 'concede' | null = scored ? (taker === 'player' ? 'goal' : 'concede') : null
    const lineType: CommentaryType = scored ? (taker === 'player' ? 'goal' : 'concede') : 'miss'

    shootoutKicksRef.current = [...shootoutKicksRef.current, { taker, scored }]
    setShootoutKicks(shootoutKicksRef.current)
    setResultBanner(text)
    setFlash(flashType)
    pushCommentary(text, lineType, `P${shootoutKicksRef.current.length}`)

    setTimeout(() => {
      setResultBanner(null)
      setFlash(null)
      nextShootoutKick()
    }, 1200)
  }

  const finishShootout = (playerWon: boolean) => {
    if (playerWon) {
      setWonOnPens(true)
      setGameState('round-result')
    } else {
      finishCup(false)
    }
  }

  // ---- Cup completion ----

  const finishCup = async (won: boolean) => {
    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
    if (questionTimerRef.current) clearInterval(questionTimerRef.current)

    const roundsWon = won ? ROUNDS.length : roundIndexRef.current

    if (user) {
      await supabase.from('cup_results').insert({
        user_id: user.id,
        quiz_id: quiz?.id ?? null,
        rounds_won: roundsWon,
        won_cup: won,
      })
    } else {
      const raw = localStorage.getItem('cupGuestStats')
      const stats = raw ? JSON.parse(raw) : { gamesPlayed: 0, cupsWon: 0, bestRound: 0 }
      stats.gamesPlayed += 1
      if (won) stats.cupsWon += 1
      stats.bestRound = Math.max(stats.bestRound, roundsWon)
      localStorage.setItem('cupGuestStats', JSON.stringify(stats))
      setGuestStats(stats)
    }

    setFinalStats({
      goalsScored: totalGoalsScoredRef.current,
      goalsConceded: totalGoalsConcededRef.current,
      correct: correctAnswersRef.current,
      incorrect: incorrectAnswersRef.current,
    })
    setGameState(won ? 'cup-won' : 'cup-lost')
  }

  const startCup = () => {
    roundIndexRef.current = 0
    setRoundIndex(0)
    setCommentary([])
    totalGoalsScoredRef.current = 0
    totalGoalsConcededRef.current = 0
    correctAnswersRef.current = 0
    incorrectAnswersRef.current = 0
    prepareRound(0)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'FootyGames Cup',
      text: 'I just won the FootyGames Cup! 🏆 Can you do better? sporting-iq.vercel.app/cup',
      url: 'https://sporting-iq.vercel.app/cup',
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`, '_blank')
    }
  }

  // ---- Render ----

  const currentRound = ROUNDS[roundIndex]

  const renderFixtures = (mode: 'pending' | 'ht' | 'ft') => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-3 text-center">
        {mode === 'pending'
          ? `Elsewhere in ${currentRound.name}`
          : mode === 'ht'
          ? `Elsewhere in ${currentRound.name} — Half Time`
          : `Elsewhere in ${currentRound.name} — Full Time`}
      </div>
      <div className="space-y-2">
        {fixtures.map((f, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
            <span className="text-right truncate text-gray-300">{f.home}</span>
            <span className="text-gray-500 font-bold text-xs">
              {mode === 'pending' ? 'vs' : mode === 'ht' ? `${f.htHome}-${f.htAway}` : `${f.ftHome}-${f.ftAway}`}
            </span>
            <span className="text-left truncate text-gray-300">{f.away}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderEndStats = (won: boolean) => (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-green-400">{finalStats.goalsScored}</div>
        <div className="text-gray-400 text-xs mt-1">Goals Scored</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-red-400">{finalStats.goalsConceded}</div>
        <div className="text-gray-400 text-xs mt-1">Goals Conceded</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center col-span-2">
        <div className="text-xl font-bold text-yellow-400">{won ? 'Cup Winner!' : currentRound.name}</div>
        <div className="text-gray-400 text-xs mt-1">Round Reached</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-green-400">{finalStats.correct}</div>
        <div className="text-gray-400 text-xs mt-1">Correct Answers</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
        <div className="text-2xl font-bold text-red-400">{finalStats.incorrect}</div>
        <div className="text-gray-400 text-xs mt-1">Incorrect Answers</div>
      </div>
    </div>
  )

  const renderEndButtons = () => {
    if (!user) {
      return (
        <div className="space-y-3">
          <button
            onClick={startCup}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
          >
            Play Again
          </button>
          <Link href="/signup" className="block w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-center">
            <div className="font-bold">Sign Up Free</div>
            <div className="text-xs text-gray-400 font-normal mt-0.5">Save your stats and appear on the leaderboard</div>
          </Link>
          <Link href="/premium" className="block w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-center">
            <div className="font-bold">Go Premium</div>
            <div className="text-xs text-gray-400 font-normal mt-0.5">View the full cup leaderboard</div>
          </Link>
        </div>
      )
    }
    if (!isPremium) {
      return (
        <div className="space-y-3">
          <button
            onClick={startCup}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
          >
            Play Again
          </button>
          <Link href="/premium" className="block w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-center">
            <div className="font-bold">Go Premium</div>
            <div className="text-xs text-gray-400 font-normal mt-0.5">See how you rank on the cup leaderboard — £2.99/mo</div>
          </Link>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <button
          onClick={startCup}
          className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
        >
          Play Again
        </button>
        <Link href="/leaderboard/cup" className="block w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition text-center font-bold">
          View Cup Leaderboard
        </Link>
      </div>
    )
  }

  const questionCard = activeQuestion && (
    <div className={`bg-black/80 backdrop-blur-md border-2 rounded-2xl p-6 mb-4 transition-all ${
      activeEventType === 'opposition'
        ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
        : 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
          activeEventType === 'opposition' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {activeEventType === 'opposition' ? '🛡️ Defending' : '⚔️ Attacking'}
        </span>
        <div className={`text-2xl font-extrabold ${questionTimeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
          {questionTimeLeft}s
        </div>
      </div>
      {activeQuestion.image_url && (
        <img src={activeQuestion.image_url} alt="Question" className="w-full rounded-xl mb-4 object-cover max-h-40" />
      )}
      <p className="text-xl sm:text-2xl font-bold leading-snug mb-5 text-center">{activeQuestion.question_text}</p>
      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B', 'C', 'D'] as const).map(option => {
          const map: Record<'A' | 'B' | 'C' | 'D', string> = { A: activeQuestion.option_a, B: activeQuestion.option_b, C: activeQuestion.option_c, D: activeQuestion.option_d }
          return (
            <button
              key={option}
              onClick={() => submitAnswer(option)}
              disabled={questionAnswered}
              className={`w-full text-center px-3 py-4 rounded-xl border-2 transition-all duration-200 ${
                questionAnswered && option === questionSelected
                  ? 'bg-gray-700 border-gray-500'
                  : questionAnswered
                  ? 'bg-gray-800 border-gray-700 opacity-50'
                  : 'bg-gray-800 border-gray-700 hover:border-green-500 cursor-pointer'
              }`}
            >
              <span className="font-bold text-green-400 mr-2">{option}</span>
              {map[option]}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (gameState === 'loading') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-400">Loading the Cup...</p>
        </div>
      </main>
    )
  }

  if (gameState === 'team-name') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎽</div>
          <h2 className="text-3xl font-bold mb-2">Name Your Team</h2>
          <p className="text-gray-400 mb-8">This is who you&apos;ll be leading through the Cup.</p>

          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value.slice(0, 20))}
            maxLength={20}
            placeholder={DEFAULT_TEAM_NAME}
            className="w-full px-4 py-3 mb-8 bg-gray-900 border border-gray-800 rounded-xl text-white text-center text-lg focus:outline-none focus:border-green-500"
          />

          {!hasQuestions && (
            <p className="text-center text-gray-500 text-sm mb-4">No quiz questions available today — check back soon.</p>
          )}

          <button
            onClick={() => {
              if (!teamName.trim()) setTeamName(DEFAULT_TEAM_NAME)
              startCup()
            }}
            disabled={!hasQuestions}
            className="w-full py-4 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg rounded-xl transition"
          >
            Start Cup →
          </button>
        </div>
      </main>
    )
  }

  if (gameState === 'pre-match') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-xs text-green-400 font-bold uppercase tracking-widest mb-2">{currentRound.name}</div>
            <div className="text-4xl mb-3">⚽</div>
            <h2 className="text-2xl font-bold mb-1">{teamName} vs {opponent}</h2>
            <p className="text-gray-400 text-sm">Round {roundIndex + 1} of {ROUNDS.length}</p>
          </div>

          <div className="mb-6">{renderFixtures('pending')}</div>

          <button
            onClick={startMatch}
            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-lg rounded-xl transition"
          >
            Kick Off →
          </button>
        </div>
      </main>
    )
  }

  if (gameState === 'round-result') {
    const margin = playerScore - oppScore
    const summary = wonOnPens
      ? 'Nerves of steel — through on penalties!'
      : margin >= 3
      ? 'A dominant performance from start to finish!'
      : margin === 2
      ? 'A comfortable win to move through!'
      : 'A hard-fought victory to advance!'
    const isFinal = roundIndex === ROUNDS.length - 1
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-b from-green-900/30 to-gray-900 border border-green-700 rounded-2xl p-6 mb-6 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-2xl font-bold mb-1">{currentRound.name} Won!</h2>
            <p className="text-gray-300 text-sm mb-3">{teamName} vs {opponent}</p>
            <div className="text-5xl font-extrabold mb-2">
              <span className="text-green-400">{playerScore}</span>
              <span className="text-gray-600 mx-3">-</span>
              <span className="text-red-400">{oppScore}</span>
            </div>
            <p className="text-green-400 font-medium mb-4">{summary}{wonOnPens ? ' (pens)' : ''}</p>
          </div>

          <div className="mb-6">{renderFixtures('ft')}</div>

          <button
            onClick={proceedFromRoundResult}
            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-lg rounded-xl transition"
          >
            {isFinal ? 'Lift the Trophy →' : 'Continue →'}
          </button>
        </div>
      </main>
    )
  }

  if (gameState === 'cup-won') {
    const confetti = ['🎉', '✨', '🎊', '⚽', '🏆', '🎉', '✨', '🎊', '⚽', '🌟']
    return (
      <main className="min-h-screen bg-gradient-to-b from-yellow-950 via-gray-950 to-gray-950 text-white px-6 py-10 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden text-3xl opacity-70 select-none">
          {confetti.map((e, i) => (
            <span
              key={i}
              className="absolute animate-bounce"
              style={{ left: `${(i * 13 + 5) % 92}%`, top: `${(i * 17 + 4) % 88}%`, animationDelay: `${i * 0.15}s` }}
            >
              {e}
            </span>
          ))}
        </div>

        <div className="relative max-w-md mx-auto text-center">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-4xl font-black mb-1 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">You Won the FootyGames Cup!</h2>
          <p className="text-2xl font-bold text-white mb-6">{teamName}</p>

          {renderEndStats(true)}

          {!user && guestStats && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 text-center text-sm text-gray-400">
              Games played: {guestStats.gamesPlayed} · Cups won: {guestStats.cupsWon} · Best run: {guestStats.bestRound}/5 rounds
            </div>
          )}

          <button
            onClick={handleShare}
            className="w-full py-3 mb-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition"
          >
            📤 Share My Win
          </button>

          {renderEndButtons()}
        </div>
      </main>
    )
  }

  if (gameState === 'cup-lost') {
    return (
      <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-3xl font-bold mb-1">Eliminated in the {currentRound.name}</h2>
          <p className="text-gray-500 text-sm mb-6">
            Lost {playerScore}-{oppScore} to {opponent}
          </p>

          {renderEndStats(false)}

          {!user && guestStats && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 text-center text-sm text-gray-400">
              Games played: {guestStats.gamesPlayed} · Cups won: {guestStats.cupsWon} · Best run: {guestStats.bestRound}/5 rounds
            </div>
          )}

          {renderEndButtons()}
        </div>
      </main>
    )
  }

  // playing / shootout
  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 pb-8 relative">
      {flash && (
        <div className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center transition-opacity duration-300 ${
          flash === 'goal' ? 'bg-green-500/25' : 'bg-red-500/25'
        }`}>
          {flash === 'goal' ? (
            <div className="text-7xl sm:text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(34,197,94,0.9)] animate-bounce tracking-wider">
              GOAL!
            </div>
          ) : (
            <div className="text-5xl sm:text-6xl font-black text-white drop-shadow-[0_0_30px_rgba(239,68,68,0.9)] tracking-wider">
              CONCEDED
            </div>
          )}
        </div>
      )}

      {halfTime && halfTimeStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-6 py-8 overflow-y-auto">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center my-auto">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">Half Time</div>
            <div className="text-5xl font-extrabold tracking-tight mb-1">
              <span className="text-green-400">{playerScore}</span>
              <span className="text-gray-600 mx-3">-</span>
              <span className="text-red-400">{oppScore}</span>
            </div>
            <div className="text-gray-400 text-sm mb-5">{teamName} vs {opponent}</div>

            <div className="mb-5">
              <div className="grid grid-cols-3 text-xs text-gray-500 mb-1 px-1">
                <span className="text-left truncate">{teamName}</span>
                <span className="text-center uppercase tracking-wide">Stat</span>
                <span className="text-right truncate">{opponent}</span>
              </div>
              {[
                ['Possession', `${halfTimeStats.yourPossession}%`, `${halfTimeStats.theirPossession}%`],
                ['Shots', halfTimeStats.yourShots, halfTimeStats.theirShots],
                ['Corners', halfTimeStats.yourCorners, halfTimeStats.theirCorners],
                ['Goals', halfTimeStats.yourGoals, halfTimeStats.theirGoals],
              ].map(([label, y, t]) => (
                <div key={label} className="grid grid-cols-3 items-center py-1.5 border-t border-gray-800 text-sm">
                  <span className="text-left font-bold text-green-400">{y}</span>
                  <span className="text-center text-gray-500 text-xs">{label}</span>
                  <span className="text-right font-bold text-red-400">{t}</span>
                </div>
              ))}
            </div>

            {renderFixtures('ht')}

            <button
              onClick={resumeSecondHalf}
              className="w-full py-3 mt-5 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition"
            >
              Start Second Half →
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-3 pb-4 mb-4 bg-gradient-to-b from-black via-gray-900 to-gray-900/95 border-b-2 border-green-600/40 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <Link href="/" className="text-green-500 font-bold text-xs">FootyGames</Link>
            <div className="text-green-400 text-xs font-bold uppercase tracking-widest">{currentRound.name}</div>
            <div className="text-gray-500 text-xs">{roundIndex + 1}/{ROUNDS.length}</div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex-1 text-right">
              <div className="text-sm sm:text-lg font-bold text-white truncate">{teamName}</div>
            </div>
            <div className="px-3 text-center shrink-0">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none">
                <span className="text-green-400">{playerScore}</span>
                <span className="text-gray-600 mx-2">-</span>
                <span className="text-red-400">{oppScore}</span>
              </div>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm sm:text-lg font-bold text-white truncate">{opponent}</div>
            </div>
          </div>

          <div className="text-center mt-1">
            <span className={`text-sm font-bold ${
              gameState === 'shootout'
                ? 'text-white'
                : matchMinute > 80
                ? 'text-red-400 animate-pulse'
                : 'text-gray-300'
            }`}>
              {gameState === 'shootout' ? '🥅 PENALTY SHOOTOUT' : `⏱️ ${matchMinute}'`}
            </span>
          </div>
        </div>

        {gameState === 'shootout' && (
          <div className="flex justify-center gap-6 mb-4 text-sm">
            <div className="flex gap-1">
              {shootoutKicks.filter(k => k.taker === 'player').map((k, i) => (
                <span key={i} className={`w-4 h-4 rounded-full ${k.scored ? 'bg-green-500' : 'bg-red-500'}`} />
              ))}
            </div>
            <div className="flex gap-1">
              {shootoutKicks.filter(k => k.taker === 'opposition').map((k, i) => (
                <span key={i} className={`w-4 h-4 rounded-full ${k.scored ? 'bg-red-500' : 'bg-green-500'}`} />
              ))}
            </div>
          </div>
        )}

        {buildup && (
          <div className={`rounded-2xl p-4 mb-4 text-center font-bold animate-pulse border ${
            buildup.type === 'opposition'
              ? 'bg-red-900/20 border-red-700 text-red-400'
              : 'bg-green-900/20 border-green-700 text-green-400'
          }`}>
            {buildup.text}
          </div>
        )}

        {resultBanner && (
          <div className={`rounded-2xl p-4 mb-4 text-center font-bold animate-pulse border ${
            flash === 'goal'
              ? 'bg-green-900/20 border-green-700 text-green-400'
              : flash === 'concede'
              ? 'bg-red-900/20 border-red-700 text-red-400'
              : 'bg-gray-800/40 border-gray-700 text-gray-300'
          }`}>
            {resultBanner}
          </div>
        )}

        {questionCard}

        {!activeQuestion && !resultBanner && !buildup && (
          <div className="text-center text-gray-500 text-sm mb-4">
            {gameState === 'shootout' ? 'Up next...' : 'Match in progress...'}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-950/60 border-b border-gray-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-sm font-semibold text-white">Match Commentary</span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto space-y-1">
            {commentary.map((line, i) => {
              const c = commentaryRowClasses(line.type)
              return (
                <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${c.row}`}>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>{line.badge}</span>
                  <span className={c.text}>{line.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
