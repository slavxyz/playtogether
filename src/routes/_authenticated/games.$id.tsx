import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import {
  SPORTS,
  SPORT_EMOJI,
  SPORT_LABEL,
  SKILL_LEVELS,
  SKILL_LABEL,
  PLAYER_LEVEL_LABEL,
  type PlayerLevel,
} from '~/lib/sports'
import { splitDateTime, combineDateTime, todayLocalDate } from '~/lib/datetime'
import type { Game, Profile } from '~/lib/types'
import type { Sport, SkillLevel } from '~/lib/sports'

function toDateTimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const Route = createFileRoute('/_authenticated/games/$id')({
  component: GameDetailsPage,
})

function GameDetailsPage() {
  const { id } = Route.useParams()
  const [game, setGame] = useState<Game | null>(null)
  const [creator, setCreator] = useState<Profile | null>(null)
  const [participants, setParticipants] = useState<Profile[]>([])
  const [sportLevels, setSportLevels] = useState<Record<string, PlayerLevel>>(
    {},
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSport, setEditSport] = useState<Sport>('football')
  const [editTitle, setEditTitle] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editDateTime, setEditDateTime] = useState('')
  const [editMaxPlayers, setEditMaxPlayers] = useState(2)
  const [editSkillLevel, setEditSkillLevel] = useState<SkillLevel>('intermediate')
  const [editPrice, setEditPrice] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    loadGame()
  }, [id])

  const loadGame = async () => {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    if (user) {
      const { data: blockData } = await supabase
        .from('game_blocked_players')
        .select('id')
        .eq('game_id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      setIsBlocked(!!blockData)
    }

    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single()

    if (gameData) {
      setGame(gameData as Game)

      const { data: creatorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', gameData.creator_id)
        .single()
      if (creatorData) setCreator(creatorData as Profile)

      const { data: partData } = await supabase
        .from('game_participants')
        .select('user_id')
        .eq('game_id', id)

      if (partData) {
        const userIds = partData.map((p: any) => p.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)
        if (profiles) setParticipants(profiles as Profile[])

        // Each participant's level for THIS game's sport
        const { data: sportsData } = await supabase
          .from('profile_sports')
          .select('profile_id, player_level')
          .eq('sport', gameData.sport)
          .in('profile_id', userIds)
        const levelMap: Record<string, PlayerLevel> = {}
        sportsData?.forEach((s: any) => {
          levelMap[s.profile_id] = s.player_level
        })
        setSportLevels(levelMap)
      }
    }
    setLoading(false)
  }

  const isParticipant = participants.some((p) => p.id === userId)
  const isCreator = game?.creator_id === userId

  const handleJoin = async () => {
    if (!userId || !game) return
    setActionLoading(true)
    const { error } = await getSupabase()
      .from('game_participants')
      .insert({ game_id: game.id, user_id: userId })
    if (error) alert(error.message)
    else await loadGame()
    setActionLoading(false)
  }

  const handleLeave = async () => {
    if (!userId || !game) return
    setActionLoading(true)
    await getSupabase()
      .from('game_participants')
      .delete()
      .eq('game_id', game.id)
      .eq('user_id', userId)
    await loadGame()
    setActionLoading(false)
  }

  const handleCancel = async () => {
    if (!game || !confirm('Cancel this game?')) return
    setActionLoading(true)
    await getSupabase()
      .from('games')
      .update({ status: 'cancelled' })
      .eq('id', game.id)
    await loadGame()
    setActionLoading(false)
  }

  const startEdit = () => {
    if (!game) return
    setEditSport(game.sport)
    setEditTitle(game.title)
    setEditLocation(game.location)
    setEditCity(game.city ?? '')
    setEditDateTime(toDateTimeLocal(game.date_time))
    setEditMaxPlayers(game.max_players)
    setEditSkillLevel((game.skill_level as SkillLevel) ?? 'intermediate')
    setEditPrice(game.price ? String(game.price) : '')
    setEditDescription(game.description ?? '')
    setEditError(null)
    setIsEditing(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!game) return
    setEditError(null)

    if (editMaxPlayers < game.current_players) {
      setEditError(
        `Max players can't be less than the ${game.current_players} players already in the game`,
      )
      return
    }

    setActionLoading(true)
    const { error } = await getSupabase()
      .from('games')
      .update({
        sport: editSport,
        title: editTitle,
        location: editLocation,
        city: editCity || null,
        date_time: new Date(editDateTime).toISOString(),
        max_players: editMaxPlayers,
        skill_level: editSkillLevel,
        price: editPrice ? parseFloat(editPrice) : 0,
        description: editDescription || null,
      })
      .eq('id', game.id)

    if (error) {
      setEditError(error.message)
    } else {
      setIsEditing(false)
      await loadGame()
    }
    setActionLoading(false)
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!game || !confirm('Remove this player from the game?')) return
    setActionLoading(true)
    const { error, count } = await getSupabase()
      .from('game_participants')
      .delete({ count: 'exact' })
      .eq('game_id', game.id)
      .eq('user_id', participantId)
    if (error) {
      alert(error.message)
    } else if (!count) {
      alert(
        "Couldn't remove player. You may not have permission to do this yet.",
      )
    }
    await loadGame()
    setActionLoading(false)
  }

  const handleBlockParticipant = async (participantId: string) => {
    if (
      !game ||
      !userId ||
      !confirm(
        'Remove and block this player? They will not be able to rejoin this game.',
      )
    )
      return
    setActionLoading(true)

    const { error: blockError } = await getSupabase()
      .from('game_blocked_players')
      .insert({ game_id: game.id, user_id: participantId, blocked_by: userId })
    if (blockError) {
      alert(blockError.message)
      setActionLoading(false)
      return
    }

    const { error: removeError } = await getSupabase()
      .from('game_participants')
      .delete()
      .eq('game_id', game.id)
      .eq('user_id', participantId)
    if (removeError) alert(removeError.message)

    await loadGame()
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Loading game...
      </div>
    )
  }

  if (!game) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Game not found.
      </div>
    )
  }

  const date = new Date(game.date_time)
  const spotsLeft = game.max_players - game.current_players
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  const hoursLeft = Math.max(
    0,
    Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
  )

  return (
    <div className="px-4 pt-6 pb-24">
      {isEditing ? (
        <form
          onSubmit={handleSaveEdit}
          className="mb-6 space-y-4 rounded-2xl border border-border bg-surface p-4"
        >
          <h2 className="font-display text-lg font-semibold text-foreground">
            Edit Game
          </h2>

          {/* Sport selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Sport
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SPORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditSport(s)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs transition-colors ${
                    editSport === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span className="text-lg">{SPORT_EMOJI[s]}</span>
                  <span className="leading-tight">{SPORT_LABEL[s]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Location
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* City */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              City
            </label>
            <input
              type="text"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Date & Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={splitDateTime(editDateTime).date}
                onChange={(e) =>
                  setEditDateTime(
                    combineDateTime(e.target.value, splitDateTime(editDateTime).time),
                  )
                }
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="time"
                value={splitDateTime(editDateTime).time}
                onChange={(e) =>
                  setEditDateTime(
                    combineDateTime(
                      splitDateTime(editDateTime).date || todayLocalDate(),
                      e.target.value,
                    ),
                  )
                }
                required
                className="w-32 shrink-0 rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Max Players */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Max Players
            </label>
            <input
              type="number"
              min={game.current_players}
              max={100}
              value={editMaxPlayers}
              onChange={(e) => setEditMaxPlayers(parseInt(e.target.value))}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Skill Level */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Skill Level
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEditSkillLevel(level)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    editSkillLevel === level
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-border text-muted-foreground hover:border-secondary/50'
                  }`}
                >
                  {SKILL_LABEL[level]}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Price per Player
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {editError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {editError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="gradient-hero shadow-glow flex-1 rounded-xl py-3 font-display font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={actionLoading}
              className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="gradient-hero p-6 text-center">
          <span className="text-4xl">
            {SPORT_EMOJI[game.sport as keyof typeof SPORT_EMOJI]}
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold text-background">
            {game.title}
          </h1>
          <span className="mt-1 inline-block rounded-full bg-background/20 px-3 py-0.5 text-sm text-background">
            {SPORT_LABEL[game.sport as keyof typeof SPORT_LABEL]}
          </span>
        </div>

        <div className="p-4">
          {/* Countdown */}
          {game.status === 'open' && diff > 0 && (
            <div className="mb-4 text-center text-sm text-muted-foreground">
              Starts in{' '}
              <span className="font-semibold text-primary">
                {daysLeft > 0 ? `${daysLeft}d ` : ''}
                {hoursLeft}h
              </span>
            </div>
          )}

          {game.status === 'cancelled' && (
            <div className="mb-4 rounded-lg bg-red-500/10 py-2 text-center text-sm font-medium text-red-400">
              This game has been cancelled
            </div>
          )}

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">
                {date.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                at{' '}
                {date.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground">{game.location}</span>
            </div>
            {game.city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">City</span>
                <span className="text-foreground">{game.city}</span>
              </div>
            )}
            {game.skill_level && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skill Level</span>
                <span className="text-secondary">
                  {SKILL_LABEL[game.skill_level as keyof typeof SKILL_LABEL]}
                </span>
              </div>
            )}
            {game.price != null && game.price > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="text-foreground">{game.price} BGN</span>
              </div>
            )}
          </div>

          {game.description && (
            <p className="mt-4 text-sm text-muted-foreground">
              {game.description}
            </p>
          )}
        </div>
      </div>
      )}

      {/* Squad meter */}
      <div className="mb-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Squad ({game.current_players}/{game.max_players})
        </h2>
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full gradient-hero transition-all"
            style={{
              width: `${(game.current_players / game.max_players) * 100}%`,
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {participants.map((p) => (
            <div key={p.id} className="relative">
              <Link
                to="/users/$id"
                params={{ id: p.id }}
                className={`flex items-center gap-2 rounded-xl border border-border bg-surface p-2.5 transition-colors hover:border-primary/50 ${
                  isCreator && p.id !== game.creator_id ? 'pr-14' : ''
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm text-muted-foreground">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    p.name?.[0]?.toUpperCase() ?? '?'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.name ?? 'Player'}
                  </p>
                  <p className="truncate text-xs">
                  {sportLevels[p.id] ? (
                    <span className="text-secondary">
                      {PLAYER_LEVEL_LABEL[sportLevels[p.id]]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No level set</span>
                  )}
                  {p.id === game.creator_id && (
                      <span className="text-primary"> · Host</span>
                    )}
                  </p>
              </div>
              </Link>
              {isCreator && p.id !== game.creator_id && (
                <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemoveParticipant(p.id)
                    }}
                    disabled={actionLoading}
                    aria-label="Remove player"
                    title="Remove player"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleBlockParticipant(p.id)
                    }}
                    disabled={actionLoading}
                    aria-label="Remove and block player"
                    title="Remove and block player"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    ⛔
                  </button>
                </div>
              )}
            </div>
          ))}
          {Array.from({ length: spotsLeft }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border p-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-muted-foreground">
                ?
              </div>
              <span className="text-sm text-muted-foreground">Open spot</span>
            </div>
          ))}
        </div>
      </div>

      {/* Host card */}
      {creator && (
        <div className="mb-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
            Host
          </h2>
          <Link
            to="/users/$id"
            params={{ id: creator.id }}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-lg text-muted-foreground">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                creator.name?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {creator.name ?? 'Unknown'}
              </p>
              <p className="text-sm text-muted-foreground">
                {creator.games_played} games played
                {creator.rating ? ` · ${creator.rating} rating` : ''}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Action bar */}
      {game.status === 'open' && !isEditing && (
        <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-background/95 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-md">
            {isCreator ? (
              <div className="flex gap-2">
                <button
                  onClick={startEdit}
                  disabled={actionLoading}
                  className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-50"
                >
                  Edit Game
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex-1 rounded-xl border border-red-500/50 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Cancel Game'}
                </button>
              </div>
            ) : isParticipant ? (
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface disabled:opacity-50"
              >
                {actionLoading ? 'Leaving...' : 'Leave Game'}
              </button>
            ) : isBlocked ? (
              <div className="rounded-xl bg-surface py-3 text-center text-sm text-muted-foreground">
                You've been removed from this game and can't rejoin.
              </div>
            ) : spotsLeft > 0 ? (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="gradient-hero shadow-glow w-full rounded-xl py-3 font-display font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? 'Joining...' : 'Join Game'}
              </button>
            ) : (
              <div className="rounded-xl bg-surface py-3 text-center text-sm text-muted-foreground">
                Game is full
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
