import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: 'oklch(var(--primary))',
        secondary: 'oklch(var(--secondary))',
        surface: 'oklch(var(--surface))',
        border: 'oklch(var(--border))',
        'muted-foreground': 'oklch(var(--muted-foreground))',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      maxWidth: {
        md: '28rem',
      },
    },
  },
  plugins: [],
} satisfies Config
