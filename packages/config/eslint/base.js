// @ts-check
/**
 * Base ESLint flat config — Delta.
 * À étendre via les configs spécifiques (`./next.js`, `./expo.js`).
 *
 * Encode notamment la règle d'import d'ARCHITECTURE.md §3.2 :
 *   core       → contracts (uniquement)
 *   db         → contracts + types Supabase générés
 *   ui-*       → design-tokens
 *   api-client → contracts
 *   jobs       → core, db, contracts
 *
 * À étendre dans `packages/<pkg>/eslint.config.js` :
 *
 *   import base from "@delta/config/eslint/base"
 *   export default [...base, { rules: { ... } }]
 */
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import importPlugin from "eslint-plugin-import"
import prettierConfig from "eslint-config-prettier"
import globals from "globals"

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Import order — readability
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-default-export": "off",
      "import/no-duplicates": "error",
      // TS sweet spots
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      // Discipline domain/adapter (cf. ARCHITECTURE.md §4.1)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps/*"],
              message:
                "Un package ne doit jamais importer depuis apps/. Voir ARCHITECTURE.md §3.2.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.config.{js,mjs,ts}", "**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
  prettierConfig,
]
