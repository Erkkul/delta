import Link from "next/link"

type Props = Readonly<{ children: React.ReactNode }>

export default function AuthLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 tablet:px-8 desktop:py-10">
        <header className="flex items-center justify-between">
          <Link
            href="/welcome"
            className="font-display text-xl font-semibold text-cream-950"
          >
            Delta
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-xl">{children}</div>
        </div>
      </div>
    </main>
  )
}
