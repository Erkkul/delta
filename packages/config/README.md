# @delta/config

Configurations partagées du monorepo : TypeScript, ESLint, Prettier, Vitest.

## TypeScript

Quatre presets dans `tsconfig/` :

| Preset | Usage |
|---|---|
| `base.json` | Base commune. À ne pas étendre directement. |
| `node.json` | Packages exécutés en Node (jobs, scripts). |
| `react.json` | Apps web (Next) et mobile (Expo). |
| `library.json` | Packages internes destinés à être consommés par d'autres packages. |

Exemple `packages/core/tsconfig.json` :

```json
{
  "extends": "@delta/config/tsconfig/library.json",
  "include": ["src/**/*"]
}
```

## ESLint (flat config)

Trois entrées dans `eslint/` :

| Entrée | Usage |
|---|---|
| `eslint/base` | Base TS + import-order + règles d'architecture. |
| `eslint/next` | Apps Next.js 15. |
| `eslint/expo` | App mobile Expo. |

Exemple `packages/core/eslint.config.js` :

```js
import base from "@delta/config/eslint/base"
export default base
```

Exemple `apps/web/eslint.config.js` :

```js
import next from "@delta/config/eslint/next"
export default next
```

## Prettier

Une config JSON dans `prettier/index.json`. Référencer dans le `package.json` du package consommateur :

```json
{
  "prettier": "@delta/config/prettier"
}
```

## Vitest

Preset partagé `vitest/base`. À étendre dans `packages/<pkg>/vitest.config.ts` :

```ts
import baseConfig from "@delta/config/vitest/base"
export default baseConfig
```
