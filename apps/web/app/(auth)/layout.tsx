type Props = Readonly<{ children: React.ReactNode }>

// Chaque page du groupe (auth) gère son propre shell (AuthSplitLayout, top
// bar dédié sur /onboarding/role, etc.). Ce layout reste un simple
// pass-through pour préserver le routing groupé sans imposer de chrome
// commun.
export default function AuthLayout({ children }: Props) {
  return children
}
