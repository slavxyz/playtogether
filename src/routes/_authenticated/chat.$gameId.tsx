import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import { SPORT_EMOJI } from '~/lib/sports'
import type { Game, Message, Profile } from '~/lib/types'

export const Route = createFileRoute('/_authenticated/chat/$gameId')({
  component: ChatPage,
})

function ChatPage() {
  const { gameId } = Route.useParams()
  const [game, setGame] = useState<Game | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadChat()
  }, [gameId])

  useEffect(() => {
    // Subscribe to new messages in real-time
    const supabase = getSupabase()
    const channel = supabase
      .channel(`chat-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => [...prev, msg])

          // Load profile if we don't have it
          if (!profiles[msg.user_id]) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', msg.user_id)
              .single()
            if (data) {
              setProfiles((prev) => ({ ...prev, [msg.user_id]: data as Profile }))
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChat = async () => {
    const supabase = getSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Load game
    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    if (gameData) setGame(gameData as Game)

    // Load messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
    if (messagesData) setMessages(messagesData as Message[])

    // Load profiles for all message authors + participants
    const { data: partData } = await supabase
      .from('game_participants')
      .select('user_id')
      .eq('game_id', gameId)

    const userIds = new Set<string>()
    messagesData?.forEach((m: any) => userIds.add(m.user_id))
    partData?.forEach((p: any) => userIds.add(p.user_id))

    if (userIds.size > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(userIds))
      if (profilesData) {
        const map: Record<string, Profile> = {}
        profilesData.forEach((p: any) => {
          map[p.id] = p as Profile
        })
        setProfiles(map)
      }
    }

    setLoading(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || !userId) return

    setSending(true)
    setNewMessage('')

    const { error } = await getSupabase()
      .from('messages')
      .insert({ game_id: gameId, user_id: userId, content })

    if (error) {
      alert(error.message)
      setNewMessage(content)
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 text-center text-muted-foreground">
        Loading chat...
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link to="/messages" className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <span className="text-xl">
          {SPORT_EMOJI[game.sport as keyof typeof SPORT_EMOJI]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold text-foreground">
            {game.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {Object.keys(profiles).length} members
          </p>
        </div>
        <Link
          to="/games/$id"
          params={{ id: game.id }}
          className="text-xs text-primary hover:underline"
        >
          View Game
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const isMe = msg.user_id === userId
              const profile = profiles[msg.user_id]
              const showAvatar =
                i === 0 || messages[i - 1].user_id !== msg.user_id

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-7 shrink-0">
                    {showAvatar && !isMe && (
                      <Link to="/users/$id" params={{ id: msg.user_id }}>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs text-muted-foreground">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            profile?.name?.[0]?.toUpperCase() ?? '?'
                          )}
                        </div>
                      </Link>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                    {showAvatar && !isMe && (
                      <p className="mb-0.5 text-xs text-muted-foreground">
                        {profile?.name ?? 'Player'}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? 'gradient-hero text-background'
                          : 'bg-surface text-foreground'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p
                      className={`mt-0.5 text-[10px] text-muted-foreground ${
                        isMe ? 'text-right' : ''
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border bg-background px-4 py-3"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-hero text-background transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  )
}
