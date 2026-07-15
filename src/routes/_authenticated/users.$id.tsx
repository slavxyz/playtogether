import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import { SPORT_EMOJI, SPORT_LABEL, PLAYER_LEVEL_LABEL } from '~/lib/sports'
import type { Profile, ProfileSport } from '~/lib/types'

export const Route = createFileRoute('/_authenticated/users/$id')({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { id } = Route.useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileSports, setProfileSports] = useState<ProfileSport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('profile_sports').select('*').eq('profile_id', id),
    ]).then(([{ data: profileData }, { data: sportsData }]) => {
      if (profileData) setProfile(profileData as Profile)
      setProfileSports((sportsData as ProfileSport[]) ?? [])
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Player not found.
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl text-muted-foreground">
              {profile.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {profile.name ?? 'Player'}
        </h1>
        {profile.city && (
          <p className="text-sm text-muted-foreground">{profile.city}</p>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="font-display text-xl font-bold text-primary">
            {profile.games_played}
          </p>
          <p className="text-xs text-muted-foreground">Games</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="font-display text-xl font-bold text-secondary">
            {profile.rating ?? '-'}
          </p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div>
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">
            Bio
          </h3>
          {profile.bio ? (
            <p className="text-foreground">{profile.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No bio yet.</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Favorite Sports
          </h3>
          {profileSports.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profileSports.map((ps) => (
                <div key={ps.sport} className="group relative">
                  <span className="cursor-default rounded-full border border-border bg-surface px-3 py-1 text-sm text-foreground transition-colors group-hover:border-primary/50">
                    {SPORT_EMOJI[ps.sport as keyof typeof SPORT_EMOJI]}{' '}
                    {SPORT_LABEL[ps.sport as keyof typeof SPORT_LABEL]}
                  </span>
                  <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs opacity-0 shadow-glow transition-opacity group-hover:opacity-100">
                    <p className="text-muted-foreground">
                      Level:{' '}
                      <span className="text-foreground">
                        {PLAYER_LEVEL_LABEL[ps.player_level]}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Position:{' '}
                      <span className="text-foreground">
                        {ps.player_position || 'Not specified'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No favorite sports yet.
            </p>
          )}
        </div>

        {profile.preferred_times && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              Preferred Times
            </h3>
            <p className="text-foreground">{profile.preferred_times}</p>
          </div>
        )}
      </div>
    </div>
  )
}
