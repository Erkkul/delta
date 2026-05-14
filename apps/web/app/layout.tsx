import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import { DM_Sans, Lora } from "next/font/google"

import "./globals.css"

const fontBody = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
})

const fontDisplay = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "Delta — producteurs locaux, rameneurs, acheteurs urbains",
  description:
    "Plateforme qui met en relation producteurs locaux, acheteurs urbains et rameneurs (particuliers en déplacement) pour acheminer des produits locaux via des trajets déjà existants.",
}

type Props = Readonly<{ children: React.ReactNode }>

export default function RootLayout({ children }: Props) {
  return (
    <html lang="fr" className={`${fontBody.variable} ${fontDisplay.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
