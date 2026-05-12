import Link from "next/link"

type Props = Readonly<{ children: React.ReactNode }>

export default function AuthLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8 tablet:px-8 desktop:py-14">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-cream-950"
          >
            Delta
          </Link>
          <p className="hidden font-body text-sm text-cream-600 tablet:block">
            Producteurs locaux, rameneurs, acheteurs urbains.
          </p>
        </header>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-xl">{children}</div>
        </div>
      </div>
    </main>
  )
}
