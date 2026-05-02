---
name: Delta Design System
version: 1.0.0
description: >
  Design system de la plateforme Delta — mise en relation de producteurs locaux,
  acheteurs urbains et rameneurs sur l'axe Normandie ↔ Paris. Mobile-first.
  Trois personas : Rameneur (rm), Acheteur (ac), Producteur (pr).

colors:
  # Palette principale — vert terroir
  green-950: "#0C1F0F"
  green-900: "#14351A"
  green-800: "#1E4D26"
  green-700: "#276634"
  green-600: "#357F43"   # Couleur d'action primaire
  green-500: "#4A9A58"
  green-400: "#6DB87A"
  green-300: "#8FCB9C"
  green-200: "#C0E4C7"
  green-100: "#E4F4E7"
  green-50:  "#F2FAF3"

  # Palette accent — terre et bois
  earth-800: "#5C3214"
  earth-500: "#B8703F"   # Accent chaud, badges, highlights
  earth-400: "#CC8E62"
  earth-200: "#EDCFB4"
  earth-100: "#F7E8D6"
  earth-50:  "#FDF5ED"

  # Palette neutre — crème naturelle
  cream-950: "#1C1917"   # Texte principal
  cream-800: "#44403C"
  cream-700: "#57534E"
  cream-600: "#78716C"   # Texte secondaire
  cream-500: "#A8A29E"   # Texte désactivé / placeholder
  cream-400: "#C4BFBB"   # Bordures actives
  cream-300: "#D6D3D1"   # Bordures par défaut
  cream-200: "#E7E5E4"   # Séparateurs
  cream-100: "#F5F5F4"   # Backgrounds sections
  cream-50:  "#FAF7F2"   # Background app global

  # Couleurs sémantiques
  color-primary:        "#357F43"   # green-600
  color-primary-dark:   "#276634"   # green-700
  color-primary-light:  "#E4F4E7"   # green-100
  color-text:           "#1C1917"   # cream-950
  color-text-secondary: "#78716C"   # cream-600
  color-text-muted:     "#A8A29E"   # cream-500
  color-background:     "#FAF7F2"   # cream-50
  color-surface:        "#FFFFFF"
  color-border:         "#D6D3D1"   # cream-300
  color-border-focus:   "#357F43"   # green-600
  color-success:        "#357F43"
  color-warning:        "#B8703F"   # earth-500
  color-error:          "#C0392B"

typography:
  font-display: "'Lora', Georgia, serif"        # Titres, headings — chaleur artisanale
  font-body:    "'DM Sans', system-ui, sans-serif"  # Corps, UI, labels

  # Échelle typographique
  text-xs:    "10px"
  text-sm:    "12px"
  text-base:  "14px"
  text-md:    "15px"
  text-lg:    "18px"
  text-xl:    "20px"
  text-2xl:   "24px"
  text-3xl:   "30px"
  text-4xl:   "36px"

  # Graisses
  font-regular:   "400"
  font-medium:    "500"
  font-semibold:  "600"
  font-bold:      "700"

  # Hauteurs de ligne
  leading-tight:  "1.2"
  leading-normal: "1.5"
  leading-relaxed: "1.6"

spacing:
  # Base unit : 4px
  space-1:  "4px"
  space-2:  "8px"
  space-3:  "12px"
  space-4:  "16px"
  space-5:  "20px"
  space-6:  "24px"
  space-8:  "32px"
  space-10: "40px"
  space-12: "48px"
  space-14: "56px"

  # Padding standards
  padding-card:   "16px"
  padding-screen: "20px 22px"
  padding-button: "14px 20px"
  padding-input:  "12px 14px"

radii:
  radius-sm:   "8px"
  radius-md:   "12px"
  radius-lg:   "16px"
  radius-xl:   "20px"
  radius-pill: "100px"
  radius-full: "50%"

shadows:
  shadow-subtle:   "0 1px 3px rgba(0,0,0,0.06)"
  shadow-card:     "0 1px 0 rgba(0,0,0,0.04), 0 2px 8px rgba(53,127,67,0.04)"
  shadow-elevated: "0 8px 24px rgba(53,127,67,0.10)"
  shadow-active:   "0 3px 10px rgba(53,127,67,0.25)"
  shadow-pressed:  "0 5px 14px rgba(53,127,67,0.32)"
  shadow-focus:    "0 0 0 3px rgba(53,127,67,0.10)"
  shadow-badge:    "0 2px 6px rgba(212,160,23,0.3)"

breakpoints:
  mobile:  "390px"   # iPhone 14 — cible primaire (rameneur + acheteur)
  tablet:  "768px"
  desktop: "1280px"  # Cible secondaire (producteur à la ferme)
---

# Delta — Design System

Plateforme de covoiturage de produits locaux. Pilote Normandie ↔ Paris.

## Philosophie visuelle

Delta repose sur **trois piliers esthétiques** qui doivent transparaître dans chaque écran :

1. **Confiance d'abord** — formes arrondies, espacements généreux, hiérarchie claire. Jamais agressif, jamais intrusif.
2. **Simplicité rameneur** — le rameneur est le persona limitant. Tout geste doit être évident en 3 secondes, même au volant ou en déplacement.
3. **Local d'abord** — la palette verte (terroir) et les accents terre évoquent la campagne et les produits artisanaux. Pas de bleu tech, pas de gris corporate.

Le produit est **mobile-first** pour les rameneurs et acheteurs, desktop accepté pour les producteurs.

---

## Couleurs

### Palette principale — Vert Terroir

Le vert est la couleur signature de Delta. Il incarne la nature, la fraîcheur des produits et la confiance.

- **`green-600` (#357F43)** est la couleur d'action primaire : boutons CTA, liens actifs, indicateurs de progression.
- **`green-700` (#276634)** pour les états hover/pressed sur fond clair.
- **`green-100` (#E4F4E7)** pour les fonds de chips, badges de statut positif, backgrounds de sections mises en avant.
- **`green-50` (#F2FAF3)** pour les fonds doux de cartes ou de champs actifs.

Ne jamais utiliser `green-800` ou plus foncé comme couleur de fond — réservé au texte ou aux illustrations.

### Palette accent — Terre & Bois

L'accent terreux sert à différencier visuellement les informations secondaires ou à apporter de la chaleur.

- **`earth-500` (#B8703F)** pour les badges de catégories de produits, les prix mis en valeur, les highlights éditoriaux.
- **`earth-200` (#EDCFB4)** pour les fonds de tags produit ou les sections "à propos du producteur".
- Ne pas utiliser l'accent earth sur des éléments interactifs — réservé aux contenus informatifs.

### Neutrals — Crème Naturelle

Les neutres ne sont pas gris mais crème, pour une sensation organique et chaleureuse.

- **`cream-950` (#1C1917)** : texte principal. Jamais `#000000` pur.
- **`cream-600` (#78716C)** : texte secondaire, labels, metadata.
- **`cream-500` (#A8A29E)** : placeholders, texte désactivé.
- **`cream-50` (#FAF7F2)** : fond global de l'application (légèrement ivoire, jamais blanc pur).

---

## Typographie

Deux familles, une logique claire :

### Lora (serif) — Display & Headings
Utilisée pour les titres de pages, les noms de produits et les accroches éditoriaux. Elle apporte la chaleur artisanale et l'authenticité locale. **Ne pas l'utiliser** pour des labels UI, des boutons ou des données tabulaires.

```
H1 — Lora Bold, 30-36px, leading 1.2
H2 — Lora SemiBold, 24px, leading 1.3
H3 — Lora Medium, 20px, leading 1.4
```

### DM Sans (sans-serif) — Body & Interface
Toute l'interface fonctionnelle : boutons, labels, inputs, metadata, prix, adresses. Lisibilité maximale à petite taille.

```
Body large  — DM Sans Regular, 15px, leading 1.6
Body base   — DM Sans Regular, 14px, leading 1.5
Body small  — DM Sans Regular, 12px, leading 1.5
Label       — DM Sans Medium, 12px, leading 1.2, uppercase tracking 0.04em
Caption     — DM Sans Regular, 11px, leading 1.4
Micro       — DM Sans Regular, 10px (uniquement pour badges/tags très courts)
```

---

## Composants

### Boutons

**Primaire (CTA)** — `green-600` fill, texte blanc, `radius-pill` (100px), `padding: 14px 20px`.
- Hover : `green-700`, `shadow-active`
- Pressed : `green-800`
- Disabled : `cream-300` fill, `cream-500` texte

**Secondaire** — fond `green-50`, texte `green-700`, bordure `green-200`, même radius.

**Tertiaire / ghost** — sans fond, texte `green-600`, underline au hover.

**Destructif** — fond `#C0392B`, texte blanc.

Toujours utiliser `radius-pill` pour les boutons principaux. Les boutons ne doivent jamais dépasser une ligne de texte.

### Cartes

Structure d'une carte standard :
- Fond blanc (`color-surface`), `radius-lg` (16px), `shadow-card`
- Padding interne : `padding-card` (16px)
- Séparateur entre sections : `cream-200` 1px
- État hover : `shadow-elevated`, transition 150ms ease

Les cartes de mission/opportunité ont une **bande colorée gauche** en `green-600` (4px) pour signaler les items actifs.

### Inputs & Champs

- Fond `cream-50`, bordure `cream-300` 1px, `radius-md` (12px)
- Focus : bordure `green-600` 1.5px, `shadow-focus`
- Padding : `12px 14px`
- Label au-dessus du champ : DM Sans Medium 12px, `cream-700`
- Message d'erreur : DM Sans Regular 12px, `color-error`
- Placeholder : `cream-500`

Tous les champs d'adresse utilisent l'API Adresse Gouv.fr avec autocomplétion.

### Badges & Statuts

Système de statuts pour les missions :
- **Disponible** — fond `green-100`, texte `green-700`
- **Réservée** — fond `earth-100`, texte `earth-500`
- **En cours** — fond `green-800`, texte blanc
- **Livrée** — fond `cream-100`, texte `cream-600`
- **Annulée** — fond `#FDEDEC`, texte `#C0392B`

Format : DM Sans Medium 11px, `radius-pill`, padding `4px 10px`.

### Navigation

Barre de navigation inférieure (mobile) : fond blanc, `shadow-elevated` inversé (ombre vers le haut).
- 4 items max
- Icône + label DM Sans 10px
- Item actif : `green-600`
- Item inactif : `cream-500`

---

## Iconographie

Utiliser la bibliothèque **Lucide Icons** (stroke, pas fill).
- Stroke width : 1.5px (standard), 2px (accentué)
- Taille standard : 20px
- Taille petite (dans badge/chip) : 14px
- Couleur : hérite du contexte (`currentColor`)

---

## Espacements & Grille

Base unit : **4px**. Toutes les valeurs d'espacement sont des multiples de 4.

Grille mobile :
- Marges latérales : 20-22px
- Gouttière entre éléments : 12px (cards compactes) / 16px (cards standard)
- Full-bleed pour les images header uniquement

---

## Personas & contextes d'usage

### Rameneur (rm-*)
- Mobile exclusivement. Souvent en déplacement.
- Densité d'information réduite. CTA très visibles.
- Pas de texte long. Données clés en premier.
- Validation par QR code (pickup + delivery).

### Acheteur (ac-*)
- Mobile-first. Navigation par envies/wishlist.
- Design plus éditorial, mise en avant des produits et producteurs.
- Aucun cash : tout le paiement passe par Stripe (escrow).

### Producteur (pr-*)
- Accepte le desktop (PC à la ferme).
- Plus de densité acceptable, formulaires plus longs.
- Ton professionnel mais chaleureux.

---

## Règles à ne jamais enfreindre

1. **Jamais de blanc pur** (`#FFFFFF`) comme fond de page — utiliser `cream-50` (#FAF7F2).
2. **Jamais de noir pur** (`#000000`) pour le texte — utiliser `cream-950` (#1C1917).
3. **Jamais de bleu** dans la palette — pas de lien bleu, pas d'accent bleu. Delta n'est pas un produit tech générique.
4. **Pas de produits frais** dans les illustrations ou exemples (hors scope MVP).
5. **Répartition toujours affichée** : 85 % producteur / 10 % rameneur / 5 % plateforme quand les montants sont visibles.
6. **Les missions sont exclusives** : ne jamais afficher un indicateur de "X autres rameneurs regardent" (crée une fausse pression).
7. **Une mission = un producteur** : les interfaces de mission ne prévoient pas de multi-producteurs.
