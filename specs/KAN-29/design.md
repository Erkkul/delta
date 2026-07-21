# Conception technique — KAN-29 Zone non couverte & liste d'attente

## Vue d'ensemble

Un mouvement simple et autonome : **persister l'intention de demande par zone**.
On introduit une table `zone_waitlist` (acheteur ↔ code postal), un endpoint
d'inscription authentifié, un compteur agrégé public par zone (RPC
`SECURITY DEFINER`, aucune PII), et l'écran AC-12 câblé dessus sous le shell
acheteur (KAN-28). Aucune dépendance au matching : le trigger automatique, la
notification et la suggestion de zone proche restent différés (KAN-42). Pas de
state machine, pas de webhook, pas de job au MVP.

## Packages touchés

- [x] `packages/contracts` — `WaitlistSignupInput` (input) + `WaitlistSignupResult`
      / `WaitlistZoneCount` (output)
- [ ] `packages/core` — aucun (insert simple ; validation dans contracts). Un
      mince mapper DB→DTO peut vivre dans `packages/db` si utile.
- [x] `packages/db` — `waitlistRepo` (insert idempotent + count par zone via RPC)
- [x] `apps/web` — page `acheteur/catalogue/zone-non-couverte/page.tsx` (ou route
      équivalente à trancher), endpoint `app/api/v1/waitlist/route.ts`, composants
      `components/buyer/waitlist/*`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun au MVP (dispatch notif → KAN-42)
- [x] `supabase/migrations` — table `zone_waitlist` + RLS + RPC count par zone
- [ ] `packages/ui-web` — non (composants locaux `components/buyer/`, cohérent
      KAN-25/26/27/28)

## Modèle de données

Référence : ARCHITECTURE.md §5.

Nouvelle table `zone_waitlist` :

- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` → référence l'utilisateur (auth), FK cohérente avec le
  modèle profils existant
- `postal_code text not null` (zone-clé du compteur — ex `87000`)
- `city text not null` (ex `Limoges`)
- `zone_label text` (libellé affiché, ex `Limoges centre` ; dérivable de city)
- `created_at timestamptz not null default now()`
- `notified_at timestamptz` **nullable** — posé dès maintenant, lu par KAN-42
  quand un trajet compatible existera. Aucun consommateur au MVP.
- Contrainte **unique (`user_id`, `postal_code`)** → inscription idempotente
  (re-soumettre ne duplique pas).

**RLS** (on par défaut) :

- `zone_waitlist_insert_self` : un acheteur ne peut insérer que sa propre ligne
  (`user_id = auth.uid()`).
- `zone_waitlist_select_self` : lecture de ses propres inscriptions uniquement.
- **Pas** de policy de lecture publique de la table (elle contient du `user_id`).
  Le compteur social proof passe par un **RPC `SECURITY DEFINER`**
  `waitlist_zone_count(postal_code text) returns int` qui ne renvoie qu'un entier
  agrégé — jamais de ligne individuelle, jamais de PII. Même posture que la
  lecture agrégée catalogue KAN-28.

Index : `create index on zone_waitlist (postal_code)` pour le count.

## API / Endpoints

Référence : ARCHITECTURE.md §3.

- `POST /api/v1/waitlist` — corps validé Zod (`WaitlistSignupInput` : `postal_code`,
  `city`, `zone_label?`). Insert idempotent (`on conflict (user_id, postal_code)
  do nothing`). Réponse `WaitlistSignupResult` (`{ status: 'subscribed' |
  'already_subscribed', zoneCount }`). Gating rôle acheteur (calqué KAN-25/28) ;
  401 si non connecté, 403 si rôle manquant.
- **Compteur** : injecté au SSR de la page AC-12 via `waitlistRepo.zoneCount`
  (appel RPC), pas d'endpoint GET dédié au MVP. Rafraîchi après POST côté client
  à partir de la réponse.
- Codes d'erreur : `WAITLIST_VALIDATION_FAILED`, `WAITLIST_UNAUTHORIZED`.

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. Pas de mission, pas de transition, pas d'event Inngest, pas de webhook au
MVP. Le futur dispatch de notification (au premier trajet compatible) sera un job
KAN-42 qui lira `notified_at`.

## Dépendances

Référence : ARCHITECTURE.md §2. Provisionnement : `tech/setup.md`.

- **Supabase Postgres** — table + RLS + RPC, déjà provisionné, cf.
  `tech/setup.md` § Supabase (Postgres + Auth + Storage + Realtime). Aucun
  nouveau service externe.
- Internes : shell acheteur + gating `/acheteur/*` (KAN-28/25), zone acheteur
  issue de l'onboarding (KAN-25), tokens DESIGN.md, icônes lucide-react. Pas
  d'API Adresse ni Stripe au runtime de KAN-29.
- Différées (pas de dépendance runtime ici, seulement conceptuelle) : trajets
  KAN-41, opportunités / notif KAN-42.

## État UI

Référence : DESIGN.md (tokens, breakpoints) + maquette ac-12.

- **Hero** : illustration, eyebrow « Bientôt chez vous », titre « Pas encore de
  rameneur dans votre zone », texte pédagogique (Delta = trajets existants), et
  **badge zone réel** dérivé du profil acheteur (`Limoges centre · 87000`).
- **Carte liste d'attente** : microcopy « Recevez une notification dès qu'un
  rameneur déclare un trajet compatible », email **pré-rempli en lecture** (issu
  du compte), bouton « Activer » → `POST /api/v1/waitlist`. Après succès : état
  confirmé (« Vous êtes inscrit·e ») + compteur mis à jour. Social proof =
  compteur **réel** ; microcopy adaptée si 0/1 inscrit (pas de fixture).
- **Actions secondaires** (`components/buyer/waitlist/`) :
  - « Parrainer un proche rameneur » → rendu **différé/inerte** (ou masqué) : la
    récompense 10 € est hors scope MVP (wallet). À ne pas câbler.
  - « Changer de zone de livraison » → lien réel vers les paramètres de zone
    (profil acheteur KAN-25).
- **Suggestion zone proche** (`Brive-la-Gaillarde couverte…`) → rendue en état
  **différé/neutre** (placeholder), jamais de données mockées (3 rameneurs / 24
  produits interdits en prod). Câblage → KAN-42.
- **Responsive** : mobile + desktop obligatoires (DESIGN.md). Bottom-nav mobile /
  header desktop hérités du shell KAN-28.

## Risques techniques

Références : ARCHITECTURE.md §9, §11, §13.

- **Tentation de mocker** social proof / rameneurs proches / produits : maquette
  riche (« 11 acheteurs », « 3 rameneurs actifs · 24 produits »). Règle
  KAN-18/19/27/28 reprise — **aucune fixture en prod**, uniquement réel ou
  empty/différé. Le seul chiffre réel au MVP est le count liste d'attente.
- **Fuite de PII via le compteur** : le RPC ne doit renvoyer qu'un entier ; test
  dédié vérifiant qu'aucune ligne individuelle n'est exposée et que la table
  n'a pas de policy de lecture publique.
- **Écran orphelin / trigger manquant** : AC-12 n'est pas auto-déclenché au MVP
  (couverture = matching KAN-42). Documenter l'accès (lien explicite) pour ne pas
  livrer une page inatteignable ; acter la dette de trigger.
- **Champ `notified_at` mort au MVP** : présent pour éviter une migration future,
  mais aucun job ne le lit. Le noter pour ne pas laisser croire à un dispatch
  actif.
- **Idempotence de l'inscription** : `on conflict do nothing` + unicité (user,
  code postal) ; vérifier le comportement de re-soumission (retour
  `already_subscribed`, pas d'erreur 500).
- **Non-régression shell KAN-28** : la page s'insère sous `acheteur/layout.tsx` —
  vérifier gating et rendu.

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/contracts`** (Vitest) : `WaitlistSignupInput` (code postal
  requis / format, ville requise, zone_label optionnel) ; forme des sorties.
- **DB / intégration** (SQL ou via repo) : insert self autorisé ; insert pour un
  autre `user_id` refusé (RLS) ; re-soumission idempotente (pas de doublon) ; RPC
  `waitlist_zone_count` renvoie le bon entier et **aucune** ligne/PII ; absence
  de policy de lecture publique sur la table.
- **Unit `apps/web`** (RTL) : carte liste d'attente (email pré-rempli lecture,
  bouton) ; état confirmé après succès ; compteur adapté à 0/1 inscrit ; actions
  parrainage différée `aria-disabled` ; suggestion zone proche en état neutre.
- **E2E web Playwright** : acheteur connecté ouvre AC-12 → voit son badge zone
  réel → clique « Activer » → inscription persistée + compteur incrémenté ;
  re-soumission → `already_subscribed` sans erreur ; non-connecté → `/login` ;
  connecté sans rôle acheteur → `/onboarding/role` (cohérent KAN-25/28) ;
  responsive mobile.
- **Accessibilité** : axe-core sur AC-12 (0 violation critique).
