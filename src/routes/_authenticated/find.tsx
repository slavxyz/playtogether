import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import { SPORTS, SPORT_LABEL, SPORT_EMOJI, SKILL_LEVELS, SKILL_LABEL } from '~/lib/sports'
import { splitDateTime, combineDateTime, todayLocalDate } from '~/lib/datetime'
import type { Game } from '~/lib/types'
import type { Sport, SkillLevel } from '~/lib/sports'

export const Route = createFileRoute('/_authenticated/find')({
  component: FindGamesPage,
})

function FindGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<SkillLevel | 'all'>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    setLoading(true)
    const { data, error } = await getSupabase()
      .from('games')
      .select('*')
      .eq('status', 'open')
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })

    if (!error && data) setGames(data as Game[])
    setLoading(false)
  }

  const filtered = games.filter((g) => {
    const matchesSearch =
      !search ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.location.toLowerCase().includes(search.toLowerCase())
    const matchesSport = sportFilter === 'all' || g.sport === sportFilter
    const matchesLevel = levelFilter === 'all' || g.skill_level === levelFilter
    const matchesCity =
      !cityFilter || (g.city ?? '').toLowerCase().includes(cityFilter.toLowerCase())
    const gameTime = new Date(g.date_time).getTime()
    const matchesFrom = !timeFrom || gameTime >= new Date(timeFrom).getTime()
    const matchesTo = !timeTo || gameTime <= new Date(timeTo).getTime()
    return (
      matchesSearch &&
      matchesSport &&
      matchesLevel &&
      matchesCity &&
      matchesFrom &&
      matchesTo
    )
  })

  const activeFilterCount = [
    levelFilter !== 'all',
    cityFilter !== '',
    timeFrom !== '',
    timeTo !== '',
  ].filter(Boolean).length

  const clearFilters = () => {
    setLevelFilter('all')
    setCityFilter('')
    setTimeFrom('')
    setTimeTo('')
  }

  const handleJoin = async (gameId: string) => {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('game_participants')
      .insert({ game_id: gameId, user_id: user.id })

    if (error) {
      if (error.code === '23505') alert('You already joined this game!')
      else alert(error.message)
    } else {
      loadGames()
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-foreground">
        Find Games
      </h1>

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or location..."
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground'
          }`}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-background">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 space-y-4 rounded-xl border border-border bg-surface p-4">
          {/* City filter */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              City
            </label>
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by city..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Level filter */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Level
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLevelFilter('all')}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  levelFilter === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                All
              </button>
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    levelFilter === level
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {SKILL_LABEL[level]}
                </button>
              ))}
            </div>
          </div>

          {/* Time range filter */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Time range
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-sm text-muted-foreground">
                  From
                </span>
                <input
                  type="date"
                  value={splitDateTime(timeFrom).date}
                  onChange={(e) =>
                    setTimeFrom(
                      combineDateTime(e.target.value, splitDateTime(timeFrom).time),
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="time"
                  value={splitDateTime(timeFrom).time}
                  onChange={(e) =>
                    setTimeFrom(
                      combineDateTime(
                        splitDateTime(timeFrom).date || todayLocalDate(),
                        e.target.value,
                      ),
                    )
                  }
                  className="w-28 shrink-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-sm text-muted-foreground">
                  To
                </span>
                <input
                  type="date"
                  value={splitDateTime(timeTo).date}
                  onChange={(e) =>
                    setTimeTo(
                      combineDateTime(e.target.value, splitDateTime(timeTo).time),
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="time"
                  value={splitDateTime(timeTo).time}
                  onChange={(e) =>
                    setTimeTo(
                      combineDateTime(
                        splitDateTime(timeTo).date || todayLocalDate(),
                        e.target.value,
                      ),
                    )
                  }
                  className="w-28 shrink-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Sport filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSportFilter('all')}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            sportFilter === 'all'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground'
          }`}
        >
          All
        </button>
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              sportFilter === s
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Games list */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading games...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-muted-foreground">
          No games found. Be the first to create one!
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} onJoin={handleJoin} />
          ))}
        </div>
      )}
    </div>
  )
}

function GameCard({
  game,
  onJoin,
}: {
  game: Game
  onJoin: (id: string) => void
}) {
  const date = new Date(game.date_time)
  const spotsLeft = game.max_players - game.current_players

  return (
    <Link
      to="/games/$id"
      params={{ id: game.id }}
      className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {SPORT_EMOJI[game.sport as keyof typeof SPORT_EMOJI]}
          </span>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              {game.title}
            </h3>
            <p className="text-sm text-muted-foreground">{game.location}</p>
          </div>
        </div>
        {game.skill_level && (
          <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-xs text-secondary">
            {SKILL_LABEL[game.skill_level as keyof typeof SKILL_LABEL]}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}{' '}
          {date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span>
          {game.current_players}/{game.max_players} players
        </span>
        {game.price && game.price > 0 && <span>{game.price} BGN</span>}
      </div>

      <div className="flex items-center justify-between">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full gradient-hero transition-all"
            style={{
              width: `${(game.current_players / game.max_players) * 100}%`,
            }}
          />
        </div>
        <span className="ml-3 text-xs text-muted-foreground">
          {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
        </span>
      </div>

      {spotsLeft > 0 && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onJoin(game.id)
          }}
          className="mt-3 w-full rounded-xl bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          Join Game
        </button>
      )}
    </Link>
  )
}
