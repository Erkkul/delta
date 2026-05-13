import { Splash } from "@delta/ui-web"

// TODO(KAN-2) : remplacer cette image distante (Unsplash) par un asset local
// dans `apps/web/public/welcome-hero.jpg` avant la mise en prod.
// L'URL ci-dessous est reprise temporairement de la maquette
// `design/maquettes/*/01-authentication.html` pour rester fidèle visuellement
// pendant le dev.
const HERO_IMAGE_SRC =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80"

export const metadata = {
  title: "Bienvenue sur Delta",
  description:
    "Producteurs locaux, rameneurs, acheteurs urbains. Le terroir, livré par un voisin.",
}

export default function WelcomePage() {
  return (
    <Splash
      imageSrc={HERO_IMAGE_SRC}
      signupHref="/signup"
      loginHref="/login"
      trustNote={<>4,8 / 5 · 32 producteurs · 14 villes</>}
    />
  )
}
