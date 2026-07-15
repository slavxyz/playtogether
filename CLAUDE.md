# Sportify

Mobile-first web app for finding and organizing casual sports games.

## Stack

- **Frontend**: TanStack Start + React 19 + TypeScript + Tailwind CSS 3
- **Backend**: Supabase (auth, Postgres, real-time, RLS)
- **Deploy**: Vercel

## Commands

```bash
npm run dev      # Start dev server (vite)
npm run build    # Production build
npm run preview  # Preview production build
```

## Project Structure

```
src/
  router.tsx              # Router config (exports getRouter)
  styles.css              # Global styles + Neon Pitch design tokens
  routes/
    __root.tsx             # Root layout (html, head, body)
    index.tsx              # Landing page
    _authenticated.tsx     # Auth layout guard (redirects to /auth)
    _authenticated/        # Protected routes
      index.tsx            # Home (upcoming, recommended, nearby games)
      find.tsx             # Find games
      create.tsx           # Create game form
      games.$id.tsx        # Game details
      profile.tsx          # Own profile
      users.$id.tsx        # Public player profile
      messages.tsx         # Chat placeholder
    auth.tsx               # Sign-in / sign-up
  lib/
    supabase.ts            # Supabase client singleton
    sports.ts              # Sport types, labels, emojis, skill levels
    types.ts               # Database types (Profile, Game, GameParticipant)
  components/              # Shared UI components
supabase/
  migrations/
    001_initial.sql        # DB schema, triggers, RLS policies
```

## Route Conventions (TanStack Start)

- File-based routing in `src/routes/`
- Use `createFileRoute` for routes, `createRootRoute` for root
- Router entry exports `getRouter()` (not `createRouter`)
- Data loading via `loader` in route options
- Use `useSuspenseQuery` in components for data fetching
- Every route with a loader must have `errorComponent` and `notFoundComponent`
- Auth-guarded routes use `_authenticated` layout with `beforeLoad` redirect
- No `useEffect` for initial data fetching

## Design System: "Neon Pitch"

Dark navy base with cyan and lime accents. Tokens defined as CSS custom properties in `src/styles.css`.

- `bg-background` — deep navy
- `text-foreground` — near white
- `bg-primary` / `text-primary` — cyan
- `text-secondary` — lime
- `bg-surface` — card/surface background
- `text-muted-foreground` — muted text
- `border-border` — subtle border

Utilities: `gradient-hero`, `text-gradient`, `shadow-glow`
Fonts: Space Grotesk (display, `font-display`), Inter (body, `font-body`)
Layout: `max-w-md` centered, fixed bottom nav bar

## Supabase

- Client initialized in `src/lib/supabase.ts`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (in `.env.local`)
- Auth: email/password + Google OAuth
- DB triggers auto-create profile on signup and auto-add game creator as participant
- RLS enforces read access for authenticated users, write access for owners only

## Sports & Skill Levels

Sports defined in `src/lib/sports.ts`: football, basketball, volleyball, tennis, table_tennis, padel, squash, chess, board_games, esports, paintball, martial_arts, running, other.

Skill levels: beginner, semi-intermediate, intermediate, semi-advanced, advanced.

Use `SPORT_LABEL`, `SPORT_EMOJI`, `SKILL_LABEL` maps for display.
