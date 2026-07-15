import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import { SPORT_EMOJI } from '~/lib/sports'
import type { Game } from '~/lib/types'

export const Route = createFileRoute('/_authenticated/messages')({
  component: MessagesPage,
})

interface GameWithLastMessage extends Game {
  last_message?: string
  last_message_at?: string
}

function MessagesPage() {
  const [games, setGames] = useState<GameWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: participantData } = await supabase
      .from('game_participants')
      .select('game_id')
      .eq('user_id', user.id)

    if (!participantData || participantData.length === 0) {
      setLoading(false)
      return
    }

    const gameIds = participantData.map((p: any) => p.game_id)
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .in('id', gameIds)
      .in('status', ['open', 'full'])
      .order('date_time', { ascending: true })

    if (gamesData) {
      const gamesWithMessages: GameWithLastMessage[] = []
      for (const game of gamesData) {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('game_id', game.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        gamesWithMessages.push({
          ...(game as Game),
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        })
      }

      gamesWithMessages.sort((a, b) => {
        if (a.last_message_at && b.last_message_at) {
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        }
        if (a.last_message_at) return -1
        if (b.last_message_at) return 1
        return new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
      })

      setGames(gamesWithMessages)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Loading chats...
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="mb-4 font-display text-2xl font-bold text-foreground">
        Chats
      </h1>

      {games.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          No chats yet. Join a game to start chatting!
          <br />
          <Link to="/find" className="mt-2 inline-block text-primary hover:underline">
            Find Games
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <Link
              key={game.id}
              to="/messages/$gameId"
              params={{ gameId: game.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/50"
            >
              <span className="text-2xl">
                {SPORT_EMOJI[game.sport as keyof typeof SPORT_EMOJI]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-foreground">
                  {game.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {game.last_message ?? 'No messages yet — say hi!'}
                </p>
              </div>
              {game.last_message_at && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(game.last_message_at)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
