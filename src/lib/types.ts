import type { Sport, SkillLevel, PlayerLevel } from './sports'

export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  age: number | null
  city: string | null
  preferred_times: string | null
  bio: string | null
  games_played: number
  rating: number | null
  created_at: string
  updated_at: string
}

export interface ProfileSport {
  id: string
  profile_id: string
  sport: Sport
  player_level: PlayerLevel
  player_position: string | null
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  creator_id: string
  sport: Sport
  title: string
  location: string
  city: string | null
  date_time: string
  max_players: number
  current_players: number
  skill_level: SkillLevel | null
  price: number | null
  description: string | null
  status: 'open' | 'full' | 'cancelled' | 'completed'
  created_at: string
}

export interface GameParticipant {
  id: string
  game_id: string
  user_id: string
  joined_at: string
}

export interface GameBlockedPlayer {
  id: string
  game_id: string
  user_id: string
  blocked_by: string
  created_at: string
}

export interface Message {
  id: string
  game_id: string
  user_id: string
  content: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      games: {
        Row: Game
        Insert: Omit<Game, 'id' | 'current_players' | 'status' | 'created_at'>
        Update: Partial<Game>
      }
      game_participants: {
        Row: GameParticipant
        Insert: Omit<GameParticipant, 'id' | 'joined_at'>
        Update: Partial<GameParticipant>
      }
      profile_sports: {
        Row: ProfileSport
        Insert: Omit<ProfileSport, 'id' | 'created_at' | 'updated_at' | 'player_level' | 'player_position'> &
          Partial<Pick<ProfileSport, 'player_level' | 'player_position'>>
        Update: Partial<ProfileSport>
      }
      game_blocked_players: {
        Row: GameBlockedPlayer
        Insert: Omit<GameBlockedPlayer, 'id' | 'created_at'>
        Update: Partial<GameBlockedPlayer>
      }
    }
    Views: Record<string, never>
    Functions: {
      delete_own_account: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
