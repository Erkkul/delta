import type { Config } from "tailwindcss"

/**
 * Tokens issus de DESIGN.md (frontmatter YAML).
 * Note : à terme, ces tokens seront extraits dans `packages/design-tokens`
 * et consommés par web + mobile. Pour l'instant, on les inline ici pour
 * débloquer apps/web — la migration vers le package partagé est tracée
 * dans ARCHITECTURE.md §3 (`design-tokens`).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: "#F2FAF3",
          100: "#E4F4E7",
          200: "#C0E4C7",
          300: "#8FCB9C",
          400: "#6DB87A",
          500: "#4A9A58",
          600: "#357F43",
          700: "#276634",
          800: "#1E4D26",
          900: "#14351A",
          950: "#0C1F0F",
        },
        earth: {
          50: "#FDF5ED",
          100: "#F7E8D6",
          200: "#EDCFB4",
          400: "#CC8E62",
          500: "#B8703F",
          800: "#5C3214",
        },
        cream: {
          50: "#FAF7F2",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#C4BFBB",
          500: "#A8A29E",
          600: "#78716C",
          700: "#57534E",
          800: "#44403C",
          950: "#1C1917",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        pill: "100px",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0,0,0,0.06)",
        card: "0 1px 0 rgba(0,0,0,0.04), 0 2px 8px rgba(53,127,67,0.04)",
        elevated: "0 8px 24px rgba(53,127,67,0.10)",
        active: "0 3px 10px rgba(53,127,67,0.25)",
        pressed: "0 5px 14px rgba(53,127,67,0.32)",
        focus: "0 0 0 3px rgba(53,127,67,0.10)",
      },
      screens: {
        mobile: "390px",
        tablet: "768px",
        desktop: "1280px",
      },
    },
  },
  plugins: [],
}

export default config
