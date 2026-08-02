# Cadrage — KAN-29 Zone non couverte & liste d'attente

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-29
- Epic : KAN-7 Wishlist & Matching
- Maquette : design/maquettes/acheteur/ac-12-zone-non-couverte.html
- PRD : §10.3 AC-12 (parcours acheteur), §12 (logique écran — état vide catalogue)
- ARCHITECTURE : §3 (monorepo / API), §5 (DB / RLS), §7 (matching — différé),
  §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

KAN-29 livre l'écran **AC-12** : l'état vide de AC-04 (catalogue) quand aucun
rameneur ne couvre la zone de l'acheteur. La maquette propose trois leviers :
(1) s'inscrire à une **liste d'attente** pour être prévenu au premier trajet
compatible, (2) **parrainer** un proche rameneur, (3) une **suggestion de zone
proche** déjà couverte.

Le cœur livrable et **réel** de ce ticket est la **liste d'attente** : une table
qui capture l'intention d'un acheteur sur une zone (code postal / ville), un
endpoint d'inscription authentifié, et l'écran AC-12 câblé dessus avec un
compteur de social proof réel (« N acheteurs dans votre quartier attendent »).
C'est une brique autonome, indépendante du matching, qui a de la valeur dès
maintenant : elle constitue le signal de demande par zone que l'équipe pourra
exploiter pour prioriser l'acquisition rameneurs.

Tout le reste de la maquette dépend de couches qui **n'existent pas encore** —
même posture qu'en KAN-28 :

- La **détection automatique** « zone non couverte » suppose de savoir quels
  rameneurs couvrent quelle zone → trajets (KAN-41) + pipeline opportunités
  (KAN-42) inexistants. KAN-28 a d'ailleurs acté que le catalogue n'est **pas**
  filtré par trajet au MVP. AC-12 ne peut donc pas être déclenché par une vraie
  logique de couverture : on livre l'écran et son formulaire, pas le trigger
  automatique.
- La **notification** « dès qu'un rameneur déclare un trajet compatible »
  suppose trajets (KAN-41) + job Inngest de matching/notif. La liste d'attente
  **stocke l'intention** maintenant ; l'envoi effectif est différé.
- La **suggestion de zone proche** (« Brive-la-Gaillarde à 12 km · 3 rameneurs
  actifs ») suppose géo + trajets + opportunités → différée KAN-42.
- Le **parrainage avec 10 € offerts** touche un système de récompense / wallet,
  **hors scope MVP** (cf. CLAUDE.md « Hors scope MVP → Wallet interne / cashback »).
  À traiter dans un ticket dédié post-MVP. Un simple lien de partage sans
  incitation monétaire pourrait être envisagé, mais reste hors du livrable KAN-29.

## Périmètre technique

**In scope :**

- **Table `zone_waitlist`** : inscription acheteur ↔ zone (code postal + ville +
  libellé), horodatée, avec `notified_at` nullable pour le futur dispatch KAN-42.
  RLS : insert/select self. Unicité (user, code postal).
- **Compteur public par zone** : RPC `SECURITY DEFINER` renvoyant uniquement un
  **count** d'inscrits pour un code postal (aucune PII) — pattern lecture
  agrégée cohérent avec le chemin de lecture publique de KAN-28.
- **Contracts** : `WaitlistSignupInput` (code postal, ville, libellé zone) +
  `WaitlistSignupResult` / `WaitlistZoneCount`.
- **API** : `POST /api/v1/waitlist` (acheteur authentifié → insert idempotent).
  Compteur social proof injecté au SSR de la page via RPC (pas d'endpoint dédié
  au MVP).
- **AC-12** `/acheteur/catalogue/zone-non-couverte` (ou route dédiée, à trancher
  à l'implémentation) : hero « Pas encore de rameneur dans votre zone » + badge
  zone (dérivé du profil acheteur KAN-25), formulaire liste d'attente réel,
  compteur réel, actions secondaires rendues en état différé/neutre.
- Sous le **shell acheteur** (KAN-28) : header desktop + bottom-nav mobile.

**Out of scope (cette US) :**

- Détection automatique « zone non couverte » (couverture rameneur) → KAN-41/42.
  AC-12 est livré comme écran atteignable, pas auto-déclenché par le matching.
- Envoi effectif de la notification au premier trajet compatible → KAN-42
  (la liste d'attente stocke l'intention ; `notified_at` reste NULL).
- Suggestion de zone proche couverte (géo + trajets + opportunités) → KAN-42.
- Parrainage avec récompense 10 € (wallet / cashback hors scope MVP) → ticket
  post-MVP dédié.
- Version mobile native (Expo) — web d'abord, cohérent KAN-25/26/27/28.

## Hypothèses

- La **zone** de l'acheteur provient de son profil / onboarding (KAN-25 — zone
  de livraison, code postal + ville). AC-12 ne redemande pas la zone, il
  l'affiche ; le formulaire n'expose que la validation « m'inscrire ».
- L'inscription liste d'attente est **authentifiée** (rôle acheteur, calqué
  gating `/acheteur/*` KAN-25/28). L'email n'est pas ressaisi — il vient du
  compte ; le champ email de la maquette est pré-rempli en lecture.
- Le compteur « N acheteurs dans votre quartier » est **réel** (count sur
  `zone_waitlist` pour le code postal), jamais mocké. S'il vaut 0/1, la microcopy
  s'adapte (pas de « 11 acheteurs » fixture).
- `notified_at` est posé dès maintenant dans le schéma pour éviter une migration
  ultérieure quand KAN-42 câblera le dispatch — mais aucun job ne le lit au MVP.
- Le déclenchement de AC-12 depuis AC-04 (bascule état vide) est laissé en
  **entrée manuelle / lien explicite** au MVP ; l'automatisation « 0 résultat
  matchable » attend le filtrage par trajet (KAN-42).
