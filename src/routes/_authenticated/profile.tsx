import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import {
  SPORTS,
  SPORT_LABEL,
  SPORT_EMOJI,
  PLAYER_LEVELS,
  PLAYER_LEVEL_LABEL,
} from '~/lib/sports'
import type { Profile } from '~/lib/types'
import type { Sport, PlayerLevel } from '~/lib/sports'

interface SportDetail {
  playerLevel: PlayerLevel
  playerPosition: string
}

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [preferredTimes, setPreferredTimes] = useState('')
  const [sportDetails, setSportDetails] = useState<
    Partial<Record<Sport, SportDetail>>
  >({})
  const [editingSport, setEditingSport] = useState<Sport | null>(null)
  const [bio, setBio] = useState('')
  const initialSportsRef = useRef<Set<Sport>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      const p = data as Profile
      setProfile(p)
      setName(p.name ?? '')
      setAvatarUrl(p.avatar_url ?? '')
      setAge(p.age?.toString() ?? '')
      setCity(p.city ?? '')
      setPreferredTimes(p.preferred_times ?? '')
      setBio(p.bio ?? '')
    }

    const { data: sportsData } = await supabase
      .from('profile_sports')
      .select('*')
      .eq('profile_id', user.id)

    const details: Partial<Record<Sport, SportDetail>> = {}
    for (const row of sportsData ?? []) {
      details[row.sport as Sport] = {
        playerLevel: row.player_level as PlayerLevel,
        playerPosition: row.player_position ?? '',
      }
    }
    setSportDetails(details)
    initialSportsRef.current = new Set(Object.keys(details) as Sport[])

    setLoading(false)
  }

  const toggleSport = (sport: Sport) => {
    setSportDetails((prev) => {
      if (prev[sport]) {
        const next = { ...prev }
        delete next[sport]
        return next
      }
      return {
        ...prev,
        [sport]: { playerLevel: 'beginner' as PlayerLevel, playerPosition: '' },
      }
    })
    setEditingSport(null)
  }

  const updateSportDetail = (sport: Sport, patch: Partial<SportDetail>) => {
    setSportDetails((prev) => {
      const current = prev[sport]
      if (!current) return prev
      return { ...prev, [sport]: { ...current, ...patch } }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          name: name || null,
          avatar_url: avatarUrl || null,
          age: age ? parseInt(age) : null,
          city: city || null,
          preferred_times: preferredTimes || null,
          bio: bio || null,
        })
        .eq('id', user.id)

      if (error) throw error

      const selectedSports = Object.keys(sportDetails) as Sport[]
      if (selectedSports.length > 0) {
        const { error: sportsError } = await supabase.from('profile_sports').upsert(
          selectedSports.map((sport) => ({
            profile_id: user.id,
            sport,
            player_level: sportDetails[sport]!.playerLevel,
            player_position: sportDetails[sport]!.playerPosition || null,
          })),
          { onConflict: 'profile_id,sport' },
        )
        if (sportsError) throw sportsError
      }

      const removedSports = Array.from(initialSportsRef.current).filter(
        (s) => !sportDetails[s],
      )
      if (removedSports.length > 0) {
        const { error: deleteError } = await supabase
          .from('profile_sports')
          .delete()
          .eq('profile_id', user.id)
          .in('sport', removedSports)
        if (deleteError) throw deleteError
      }
      initialSportsRef.current = new Set(selectedSports)

      setMessage({ type: 'success', text: 'Profile updated!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await getSupabase().auth.signOut()
    window.location.href = '/auth'
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setDeleting(true)

    try {
      const { error } = await getSupabase().rpc('delete_own_account')
      if (error) throw error

      await getSupabase().auth.signOut()
      window.location.href = '/auth'
    } catch (err: any) {
      setDeleteError(err.message ?? 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="px-4 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Profile
        </h1>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          Sign Out
        </button>
      </div>

      {/* Avatar preview */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surface">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl text-muted-foreground">
              {name ? name[0].toUpperCase() : '?'}
            </span>
          )}
        </div>
        <div>
          <p className="font-display font-semibold text-foreground">
            {name || 'Set your name'}
          </p>
          <p className="text-sm text-muted-foreground">
            {profile?.games_played ?? 0} games played
            {profile?.rating ? ` · ${profile.rating} rating` : ''}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 pb-8">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Avatar URL */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Avatar URL
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Age & City */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Age
            </label>
            <input
              type="number"
              min={1}
              max={149}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Sofia"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Preferred Times */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Preferred Playing Times
          </label>
          <input
            type="text"
            value={preferredTimes}
            onChange={(e) => setPreferredTimes(e.target.value)}
            placeholder="e.g. Weekday evenings, Weekend mornings"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Favorite Sports */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Favorite Sports
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SPORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSport(s)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition-colors ${
                  sportDetails[s]
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/50'
                }`}
              >
                <span className="text-lg">{SPORT_EMOJI[s]}</span>
                <span className="leading-tight">{SPORT_LABEL[s]}</span>
              </button>
            ))}
          </div>

          {Object.keys(sportDetails).length > 0 && (
            <div className="mt-3 space-y-2">
              {SPORTS.filter((s) => sportDetails[s]).map((sport) => {
                const detail = sportDetails[sport]!
                const isEditing = editingSport === sport

                return (
                  <div
                    key={sport}
                    className="rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="text-lg">{SPORT_EMOJI[sport]}</span>
                        {SPORT_LABEL[sport]}
                      </span>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => setEditingSport(sport)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Player Level
                          </label>
                          <select
                            value={detail.playerLevel}
                            onChange={(e) =>
                              updateSportDetail(sport, {
                                playerLevel: e.target.value as PlayerLevel,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {PLAYER_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {PLAYER_LEVEL_LABEL[level]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Player Position (optional)
                          </label>
                          <input
                            type="text"
                            value={detail.playerPosition}
                            onChange={(e) =>
                              updateSportDetail(sport, {
                                playerPosition: e.target.value,
                              })
                            }
                            placeholder="e.g. Goalkeeper, Point Guard"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingSport(null)}
                          className="text-xs font-medium text-secondary hover:underline"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-0.5 text-sm">
                        <p className="text-muted-foreground">
                          Level:{' '}
                          <span className="text-foreground">
                            {PLAYER_LEVEL_LABEL[detail.playerLevel]}
                          </span>
                        </p>
                        {detail.playerPosition && (
                          <p className="text-muted-foreground">
                            Position:{' '}
                            <span className="text-foreground">
                              {detail.playerPosition}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself..."
            rows={3}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="gradient-hero shadow-glow w-full rounded-xl px-4 py-3.5 font-display font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Danger zone */}
      <div className="mb-8 rounded-xl border border-red-500/30 p-4">
        <h2 className="font-display font-semibold text-red-400">
          Danger Zone
        </h2>

        {!showDeleteConfirm ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This
              can&apos;t be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-3 rounded-lg border border-red-500/50 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete Account
            </button>
          </>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-foreground">
              Are you sure? This will permanently delete your profile, the
              games you created, your messages, and remove you from all
              games you&apos;ve joined. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteError(null)
                }}
                disabled={deleting}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
