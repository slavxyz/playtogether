import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import {
  SPORTS,
  SPORT_LABEL,
  SPORT_EMOJI,
  SKILL_LEVELS,
  SKILL_LABEL,
} from '~/lib/sports'
import { splitDateTime, combineDateTime, todayLocalDate } from '~/lib/datetime'

export const Route = createFileRoute('/_authenticated/create')({
  component: CreateGamePage,
})

function CreateGamePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sport, setSport] = useState(SPORTS[0])
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [skillLevel, setSkillLevel] = useState(SKILL_LEVELS[2])
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('games').insert({
        creator_id: user.id,
        sport,
        title,
        location,
        city: city || null,
        date_time: new Date(dateTime).toISOString(),
        max_players: maxPlayers,
        skill_level: skillLevel,
        price: price ? parseFloat(price) : 0,
        description: description || null,
      })

      if (error) throw error
      navigate({ to: '/' })
    } catch (err: any) {
      setError(err.message ?? 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
        Create Game
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 pb-8">
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
                onClick={() => setSport(s)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs transition-colors ${
                  sport === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/50'
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
          <label
            htmlFor="title"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Football 5v5"
            required
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Sofia Sports Center"
            required
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* City */}
        <div>
          <label
            htmlFor="city"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            City
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Sofia"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Date & Time */}
        <div>
          <label
            htmlFor="date"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Date & Time
          </label>
          <div className="flex items-center gap-2">
            <input
              id="date"
              type="date"
              value={splitDateTime(dateTime).date}
              onChange={(e) =>
                setDateTime(combineDateTime(e.target.value, splitDateTime(dateTime).time))
              }
              required
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              id="time"
              type="time"
              value={splitDateTime(dateTime).time}
              onChange={(e) =>
                setDateTime(
                  combineDateTime(
                    splitDateTime(dateTime).date || todayLocalDate(),
                    e.target.value,
                  ),
                )
              }
              required
              className="w-32 shrink-0 rounded-xl border border-border bg-surface px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Max Players */}
        <div>
          <label
            htmlFor="maxPlayers"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Max Players
          </label>
          <input
            id="maxPlayers"
            type="number"
            min={2}
            max={100}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
            required
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                onClick={() => setSkillLevel(level)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  skillLevel === level
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
          <label
            htmlFor="price"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Price per Player (optional)
          </label>
          <input
            id="price"
            type="number"
            min={0}
            step={0.5}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra details..."
            rows={3}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="gradient-hero shadow-glow w-full rounded-xl px-4 py-3.5 font-display font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  )
}
