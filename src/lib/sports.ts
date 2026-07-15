export const SPORTS = [
  'football',
  'basketball',
  'volleyball',
  'tennis',
  'table_tennis',
  'padel',
  'squash',
  'chess',
  'board_games',
  'esports',
  'paintball',
  'martial_arts',
  'running',
  'other',
] as const

export type Sport = (typeof SPORTS)[number]

export const SPORT_LABEL: Record<Sport, string> = {
  football: 'Football',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  tennis: 'Tennis',
  table_tennis: 'Table Tennis',
  padel: 'Padel',
  squash: 'Squash',
  chess: 'Chess',
  board_games: 'Board Games',
  esports: 'Esports',
  paintball: 'Paintball',
  martial_arts: 'Martial Arts',
  running: 'Running',
  other: 'Other',
}

export const SPORT_EMOJI: Record<Sport, string> = {
  football: '\u26BD',
  basketball: '\uD83C\uDFC0',
  volleyball: '\uD83C\uDFD0',
  tennis: '\uD83C\uDFBE',
  table_tennis: '\uD83C\uDFD3',
  padel: '\uD83C\uDFBE',
  squash: '\uD83C\uDFBE',
  chess: '\u265F\uFE0F',
  board_games: '\uD83C\uDFB2',
  esports: '\uD83C\uDFAE',
  paintball: '\uD83C\uDFAF',
  martial_arts: '\uD83E\uDD4B',
  running: '\uD83C\uDFC3',
  other: '\uD83C\uDFC6',
}

export const SKILL_LEVELS = [
  'beginner',
  'semi-intermediate',
  'intermediate',
  'semi-advanced',
  'advanced',
] as const

export type SkillLevel = (typeof SKILL_LEVELS)[number]

export const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  'semi-intermediate': 'Semi-Intermediate',
  intermediate: 'Intermediate',
  'semi-advanced': 'Semi-Advanced',
  advanced: 'Advanced',
}

export const PLAYER_LEVELS = [
  'beginner',
  'novice',
  'intermediate',
  'advanced',
  'semi-pro',
  'professional',
] as const

export type PlayerLevel = (typeof PLAYER_LEVELS)[number]

export const PLAYER_LEVEL_LABEL: Record<PlayerLevel, string> = {
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  'semi-pro': 'Semi-Pro',
  professional: 'Professional',
}
