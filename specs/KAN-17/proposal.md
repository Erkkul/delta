# Cadrage — KAN-17 Informations profil & ferme

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-17
- Epic : KAN-4 Profil Producteur
- Maquettes :
  - `design/maquettes/producteur/pr-08-profil-public.html` (édition + preview vue acheteur)
  - `design/maquettes/producteur/pr-09-parametres.html` (uniquement les sections producteur — pause boutique)
  - `design/maquettes/producteur/pr-02-onboarding-stripe.html` (étape 1 « Profil ferme », déférée depuis KAN-16)
- PRD : §10.2 PR-08 Profil public producteur (+ §10.2 PR-02 étape 1, §10.2 PR-09)
- ARCHITECTURE : §3 (monorepo + Storage), §5 (DB — extension table `producers`), §9 (RLS, données sensibles : adresse exacte), §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

Le `producers` row créé par KAN-16 ne contient aujourd'hui que les volets vérifications (SIRET) et paiement (Stripe Connect). KAN-17 ajoute la **couche publique** qui rend une ferme visible et désirable côté acheteur : nom commercial, description, logo, photos d'ambiance, labels/certifications, zone publique de provenance, adresse exacte du point de récupération, créneaux. C'est aussi la première feature qui introduit :

- des **uploads d'images utilisateur** (logo + galerie ferme) → Supabase Storage `producer-photos`,
- une **donnée à visibilité asymétrique** (adresse exacte privée, révélée uniquement aux rameneurs ayant réservé une mission validée par paiement acheteur — cf. décisions produit),
- une intégration **API Adresse Gouv.fr** pour l'autocomplétion d'adresse (décision 2026-05-01),
- la notion de **boutique en pause** (toggle PR-09) qui masque les produits sans toucher leur statut.

KAN-17 finalise l'onboarding producteur (étape 1 du wizard `/onboarding/producer`) et fournit l'écran d'édition standalone (`/producer/profile`) réutilisé ensuite tout au long de la vie du compte.

## Périmètre technique

**In scope :**

- Étape 1 « Profil ferme » du wizard `/onboarding/producer` (orchestrée avec KAN-16) : saisie nom, description, logo, zone publique. Persistance progressive sur `producers`.
- Page `/producer/profile` (split édition + preview, cf. PR-08) accessible depuis la sidebar producteur, identique en wizard initial et en édition ultérieure (même composant, même endpoint, même validation).
- Édition des champs publics : `display_name`, `public_description` (500 c. max), `profile_photo_url` (logo), `labels` (chips multi-select sur enum), `farm_photos` (0 à 3, ordre stable).
- Édition adresse de récupération : `pickup_address` (adresse exacte), `pickup_public_zone` (libellé commune + département), `pickup_days` (multi-select Lun/Mar/.../Dim), `pickup_hours_start` + `pickup_hours_end`. Autocomplétion via API Adresse Gouv.fr.
- Endpoint `GET /api/v1/producer/profile` (self) + `PATCH /api/v1/producer/profile` (partial update, Zod).
- Upload photos : route `POST /api/v1/producer/photos` (logo et galerie) qui signe l'upload Supabase Storage et persiste l'URL sur `producers`. Suppression d'une photo réinitialise le slot.
- Toggle « Boutique en pause » (PR-09) : booléen `paused` sur `producers`. Tant que `true`, les produits ne sont plus visibles côté catalogue acheteur (gating exprimé par RLS sur `products`, étend la condition existante de KAN-16).
- RLS adresse exacte (`pickup_address`) : la colonne reste lisible par le producteur lui-même, par le service_role, et par les rameneurs ayant une mission `confirmed`/`picked_up`/`delivered` sur ce producteur. Non lisible par les acheteurs, jamais. (Détail : `design.md`.)
- Vue publique préfigurée dans la preview (PR-08, panel droit) : composant partagé qui sera réutilisé par AC-08bis (KAN-53). Pas de route publique livrée ici — c'est de la preview client-side à partir des données du PATCH.

**Out of scope (cette US) :**

- Page publique acheteur AC-08bis (`/p/[producer-id]`) et avis publics → **KAN-53** (Profils publics & avis).
- Sections non-producteur de PR-09 (changement email/mot de passe → KAN-3, notifications → KAN-14, RGPD export/suppression → backlog, multi-rôle → KAN-37 / KAN-25).
- Mobile (`apps/mobile/`) — non scaffold, différé global.
- Refonte du processus de modification email/SIRET — couvert par KAN-3 / KAN-16.
- Image processing serveur (resize, watermark, optimisation WebP) — au MVP on accepte JPG/PNG/WebP tel quel, taille max 5 MB (config bucket).

## Hypothèses

- Le bucket `product-photos` (KAN-20) n'existe pas encore (Storage seulement provisionné dans `tech/setup.md`). On crée ici un bucket dédié `producer-photos` (public, 5 MB, MIME jpeg/png/webp) — cohérent avec le bucket `product-photos` du setup, mais séparé pour permettre des policies indépendantes.
- L'API Adresse Gouv.fr (déjà provisionnée, sans clé) est utilisée directement depuis le client pour l'autocomplétion. Les coordonnées (lat/lng) retournées sont stockées en colonne `pickup_location geography(Point, 4326)` (PostGIS) pour servir plus tard au matching (KAN-42) — défense en avance, pas de logique active dans KAN-17.
- Les labels/certifications sont un **enum fermé** au MVP (`Bio AB`, `Demeter`, `Nature & Progrès`, `HVE niveau 3`, `Producteur fermier`). « SIRET vérifié » est un chip dérivé de `siret_status = 'verified'`, pas un label éditable.
- L'étape 1 du wizard KAN-16 est intentionnellement vide aujourd'hui (placeholder « Profil ferme »). KAN-17 la remplit en réutilisant le même composant que la page `/producer/profile` (un seul formulaire, deux contextes).
- La preview vue acheteur est rendue 100 % côté client (pas d'aller-retour serveur) à partir du state du formulaire — pas de route publique nécessaire.
- Pas de notif quand un producteur édite son profil. Édition silencieuse, sans audit trail à ce stade (le row `producers` a un `updated_at` qui suffit).
