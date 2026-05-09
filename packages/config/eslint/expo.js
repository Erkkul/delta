// @ts-check
/**
 * Expo / React Native — extends base avec React + React Hooks (sans Next).
 *
 *   import expo from "@delta/config/eslint/expo"
 *   export default expo
 */
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"

import base from "./base.js"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
]
