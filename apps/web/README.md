# @delta/web

Application web Delta — Next.js 15 App Router.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS (tokens issus de `DESIGN.md`)
- TypeScript strict (`@delta/config/tsconfig/react.json`)
- ESLint (`@delta/config/eslint/next`)

## Commandes (depuis la racine du monorepo)

```bash
pnpm --filter @delta/web dev        # Next dev server (http://localhost:3000)
pnpm --filter @delta/web build      # build prod
pnpm --filter @delta/web lint
pnpm --filter @delta/web typecheck
```

Ou via Turbo :

```bash
pnpm dev        # tous les apps en parallèle
pnpm build      # tous les apps + packages
```

## Déploiement

Déployé sur Vercel (cf. `tech/setup.md` § Vercel) avec **Root Directory = `apps/web`**.
