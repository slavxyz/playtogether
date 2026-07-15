import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import { SPORT_EMOJI, SPORT_LABEL, SKILL_LABEL } from '~/lib/sports'
import type { Game, Profile } from '~/lib/types'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasFavoriteSports, setHasFavoriteSports] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileData) setProfile(profileData as Profile)

    // Load user's upcoming games
    const { data: participantData } = await supabase
      .from('game_participants')
      .select('game_id')
      .eq('user_id', user.id)

    if (participantData && participantData.length > 0) {
      const gameIds = participantData.map((p: any) => p.game_id)
      const { data: games } = await supabase
        .from('games')
        .select('*')
        .in('id', gameIds)
        .gte('date_time', new Date().toISOString())
        .in('status', ['open', 'full'])
        .order('date_time', { ascending: true })
        .limit(5)
      if (games) setUpcomingGames(games as Game[])
    }

    // Load recommended games (based on favorite sports, or all open)
    const { data: sportsData } = await supabase
      .from('profile_sports')
      .select('sport')
      .eq('profile_id', user.id)

    const favSports =
      sportsData && sportsData.length > 0
        ? sportsData.map((s) => s.sport)
        : null
    setHasFavoriteSports(!!favSports)

    let query = supabase
      .from('games')
      .select('*')
      .eq('status', 'open')
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })
      .limit(5)

    if (favSports) {
      query = query.in('sport', favSports)
    }

    const { data: recGames } = await query
    if (recGames) setRecommendedGames(recGames as Game[])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="mb-1 font-display text-2xl font-bold text-foreground">
        Welcome{profile?.name ? `, ${profile.name}` : ''}!
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Find your game. Join the squad.
      </p>

      {/* Upcoming games */}
      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Your Upcoming Games
        </h2>
        {upcomingGames.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted-foreground">
            No upcoming games.{' '}
            <Link to="/find" className="text-primary hover:underline">
              Find one
            </Link>{' '}
            or{' '}
            <Link to="/create" className="text-primary hover:underline">
              create one
            </Link>
            !
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <SmallGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          {hasFavoriteSports ? 'Recommended for You' : 'Available Games'}
        </h2>
        {recommendedGames.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted-foreground">
            No games available right now.{' '}
            <Link to="/create" className="text-primary hover:underline">
              Create the first one
            </Link>
            !
          </div>
        ) : (
          <div className="space-y-2">
            {recommendedGames.map((game) => (
              <SmallGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SmallGameCard({ game }: { game: Game }) {
  const date = new Date(game.date_time)

  return (
    <Link
      to="/games/$id"
      params={{ id: game.id }}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/50"
    >
      <span className="text-2xl">
        {SPORT_EMOJI[game.sport as keyof typeof SPORT_EMOJI]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-semibold text-foreground">
          {game.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}{' '}
          {date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · {game.location}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-foreground">
          {game.current_players}/{game.max_players}
        </p>
        {game.skill_level && (
          <p className="text-xs text-secondary">
            {SKILL_LABEL[game.skill_level as keyof typeof SKILL_LABEL]}
          </p>
        )}
      </div>
    </Link>
  )
}
