import { AuthHeroPanel, AuthSplitLayout } from "@delta/ui-web"
import Link from "next/link"

// Mêmes image et décor que /forgot-password (cf. notes.md KAN-157 :
// réutilisation visuelle des écrans auth existants).
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1400&q=80"

export const metadata = {
  title: "Vérifiez votre email — Delta",
  description:
    "Si un compte existe pour cette adresse, un code à 6 chiffres a été envoyé.",
}

type SearchParams = Promise<{ email?: string }>

/**
 * AU-FP2 — confirmation neutre après demande de récupération (KAN-157).
 *
 * Message volontairement neutre (« Si un compte existe pour… ») pour ne
 * jamais confirmer ni infirmer l'existence du compte. Voir spec
 * `specs/KAN-157/design.md` §Risques techniques (anti-énumération).
 *
 * Le lien « Renvoyer le code » renvoie vers `/forgot-password?email=…`
 * (rate-limit serveur protège du spam). Le CTA principal envoie vers
 * `/reset-password?email=…` pour saisir l'OTP reçu.
 */
export default async function ForgotPasswordSentPage(props: {
  searchParams: SearchParams
}) {
  const params = await props.searchParams
  const email = (params.email ?? "").trim()
  const targetEmail = email || "votre adresse"

  const hero = (
    <AuthHeroPanel
      imageSrc={HERO_IMAGE_SRC}
      eyebrow="Étape 1 sur 2"
      title={
        <>
          Vérifiez votre
          <br />
          boîte mail.
        </>
      }
      subtitle="Si un compte existe pour cette adresse, vous recevrez un code à 6 chiffres dans la prochaine minute."
    />
  )

  if (!email) {
    return (
      <AuthSplitLayout hero={hero}>
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-cream-950">
            Adresse manquante.
          </h1>
          <p className="mt-3 font-body text-md text-cream-700">
            Recommencez depuis l&apos;étape précédente.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 hover:bg-green-700"
          >
            Retour à la récupération
          </Link>
        </div>
      </AuthSplitLayout>
    )
  }

  const resetHref = `/reset-password?email=${encodeURIComponent(email)}`
  const resendHref = `/forgot-password?email=${encodeURIComponent(email)}`

  return (
    <AuthSplitLayout hero={hero}>
      <div className="flex flex-col gap-6 rounded-lg border border-cream-200 bg-white p-6 shadow-card tablet:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-green-50 text-green-700">
          <MailIcon />
        </div>

        <div className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-2xl font-semibold leading-tight text-cream-950">
            Vérifiez votre boîte mail
          </h1>
          <p className="font-body text-md leading-relaxed text-cream-700">
            Si un compte existe pour <b className="text-cream-950">{targetEmail}</b>,
            un code à 6 chiffres vient de partir. Il reste valable 1 heure.
          </p>
        </div>

        <Link
          href={resetHref}
          className="flex items-center justify-center rounded-pill bg-green-600 px-6 py-3.5 font-body text-base font-semibold text-cream-50 hover:bg-green-700"
        >
          Saisir le code
        </Link>

        <div className="flex flex-col items-center gap-2 font-body text-sm text-cream-600">
          <div>
            Pas reçu ?{" "}
            <Link
              href={resendHref}
              className="font-semibold text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
            >
              Renvoyer un code
            </Link>
          </div>
          <p className="font-body text-xs text-cream-500">
            Pensez à vérifier vos spams.
          </p>
        </div>
      </div>

      <p className="text-center font-body text-sm text-cream-600">
        Mauvaise adresse ?{" "}
        <Link
          href="/forgot-password"
          className="text-green-700 underline decoration-cream-300 underline-offset-2 hover:text-green-800"
        >
          Modifier l&apos;email
        </Link>
        .
      </p>
    </AuthSplitLayout>
  )
}

function MailIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}
