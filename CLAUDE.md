# Delta — Contexte projet pour Claude

Charge ce fichier à l'ouverture du projet pour comprendre rapidement où on en est. Les détails sont dans les documents référencés ci-dessous, ne les recopie pas ici.

---

## Le projet en 30 secondes

**Delta** (nom de code provisoire) est une plateforme qui met en relation **producteurs locaux**, **acheteurs urbains** et **rameneurs** (particuliers en déplacement) pour acheminer des produits locaux via des trajets déjà existants. Déploiement national, sur tous les axes ruraux-urbains.

**Valeur unique** : utiliser des trajets que les gens font de toute façon, plutôt que créer une nouvelle logistique. Trois bénéfices : juste rémunération producteur, accessibilité urbaine, réduction CO₂.

## Statut

- **Phase** : conception produit, pré-développement
- **Maquettes** : 11 écrans prioritaires posés (rameneur, producteur, acheteur). Avancement détaillé sur Jira (projet KAN).
- **Décisions structurantes** : prises (voir ci-dessous)
- **Backlog** : structuré sur Jira (erkulaws.atlassian.net, projet KAN) — épics, features et subtasks créés pour l'ensemble du MVP
- **Code** : pas commencé

## Modèle d'expérience (important — flip vs PRD initial)

Le **rameneur est l'initiateur** de la transaction, pas le système. Il déclare un trajet, le système calcule en arrière-plan les opportunités combinant producteurs côté destination + voisins demandeurs côté origine, le rameneur réserve une mission. Logique inverse d'un Deliveroo classique. Si Claude trouve une contradiction entre le PRD original et cette logique, **cette logique prime** (le PRD sera mis à jour).

## Où trouver quoi

| Question | Document |
|----------|----------|
| Vision, marché, positionnement, personas, user stories, sitemap, flow mission | `PRD.md` *(local uniquement, non versionné)* |
| Carte des écrans MVP avec IDs | `PRD.md` — section 10 |
| Cycle de vie d'une mission, machine à états, paiement, QR codes | `PRD.md` — section 11 |
| Parcours acheteur détaillé (logique écran par écran) | `PRD.md` — section 12 |
| Backlog MVP (épics, features, subtasks) | Jira KAN — erkulaws.atlassian.net |
| Mapping ticket Jira ↔ écran ↔ maquette | `produit/jira_mapping.md` |
| Journal des arbitrages produit (avec dates) | `produit/decisions/decisions_produit.md` |
| Maquettes HTML cliquables | `design/maquettes/rameneur/` |
| Stack technique, structure du monorepo, conventions de code | `ARCHITECTURE.md` — sections 2 à 4 |
| Modélisation DB, RLS, migrations | `ARCHITECTURE.md` — section 5 |
| Implémentation machine à états mission, pipeline matching, flow Stripe | `ARCHITECTURE.md` — sections 6 à 8 |
| Sécurité, tests, observabilité, CI/CD | `ARCHITECTURE.md` — sections 9 à 12 |
| Stratégie free-tier (services, triggers d'upgrade, workarounds) | `ARCHITECTURE.md` — section 13 |
| Playbook pour ajouter une feature (où placer le code, checklist) | `ARCHITECTURE.md` — section 14 |
| Journal des décisions techniques (avec dates) | `ARCHITECTURE.md` — section 18 |

## Décisions clés (résumé — détails dans `produit/decisions/`)

- **Modèle paiement** : escrow Stripe Connect à la réservation, libération à la livraison effective (option B)
- **Mécanique remise** : QR codes pickup (chez producteur) + QR delivery (chez chaque acheteur). Pas de cash.
- **Répartition** : 85 % producteur / 10 % rameneur / 5 % plateforme
- **Wishlist acheteur** : privée en v1 (matching côté serveur)
- **Réservation mission** : exclusive, premier rameneur qui clique verrouille
- **Une mission = un producteur** au MVP
- **Capacité véhicule** : qualitative — sac / coffre / break
- **Dates seulement** au MVP (pas d'heures de départ/retour)
- **Autocomplétion adresses** : API Adresse Gouv.fr
- **Produits MVP** : secs et agricoles non sensibles uniquement (pas de frais, pas d'alcool, pas de transformés sensibles)
- **Statut juridique plateforme** : mise en relation, responsabilités limitées (rôle marketplace pur)
- **Modèle de compte** : multi-rôles progressif — le compte rameneur inclut la capacité d'achat ; un acheteur peut devenir rameneur en complétant son profil ; les producteurs partagent le même système de compte avec accès à leur espace via onglet dédié
- **Vérification SIRET** : asynchrone — le producteur peut configurer profil et catalogue mais les produits restent non visibles jusqu'à validation
- **Social login** : Google et Apple disponibles dès le MVP

## Décisions techniques clés (résumé — détails dans `ARCHITECTURE.md`)

- **Monorepo** : Turborepo + pnpm, TypeScript end-to-end, séparation stricte domain (`packages/core`) / adapter (Next handlers, jobs, UI)
- **Web** : Next.js 15 App Router + Tailwind + shadcn/ui sur Vercel
- **Mobile** : Expo SDK 53 + NativeWind 4, builds via EAS
- **API** : Next.js Route Handlers + Zod (`packages/contracts`), versionnée `/api/v1/`
- **DB** : Supabase Postgres + PostGIS, **RLS on par défaut**, migrations versionnées
- **Auth** : Supabase Auth + Google + Apple, JWT user-side, service role réservé aux jobs/webhooks
- **Jobs asynchrones** : Inngest (matching, notifs, timers, expirations)
- **Realtime** : Supabase Realtime pour chat mission et statuts live
- **Recherche** : Postgres FTS au MVP (pas d'Algolia/Meilisearch)
- **Paiement** : Stripe Connect Express, escrow plateforme, webhook signé + table d'idempotence
- **State machine mission** : discriminated union TS + audit trail immutable (`mission_events`)
- **Matching** : table matérialisée `opportunities` rafraîchie par events Inngest, buffer géo 10 km
- **Tests** : Vitest (unit `packages/core`) + Playwright (E2E web) + Maestro (E2E mobile)
- **Observabilité** : Sentry + pino JSON logs + Vercel Analytics + dashboard Inngest
- **Stratégie coût** : free-tier first pendant le dev, bascule payant événement par événement (cf. `ARCHITECTURE.md` §13)

## Hors scope MVP (pour ne pas réintroduire)

**Produit :**
- Produits frais / chaîne du froid
- Multi-producteurs par mission
- Wishlist publique / carte de la demande
- Wallet interne / cashback
- Matching algorithmique automatique commande → rameneur

**Technique :**
- Microservices, GraphQL, tRPC, NestJS au MVP
- Algolia / Meilisearch (Postgres FTS suffit)
- Kubernetes / Docker en prod (Vercel + Supabase suffisent)
- i18n active (français seul, next-intl scaffoldé pour v2)

## Conventions

- **Langue** : tout en français (docs, code, UI). Glossaire technique en anglais accepté.
- **Dossiers** : noms simples au pluriel ou singulier selon évidence, sans numéros préfixés.
- **Maquettes** : nommage `[persona-id]-[slug].html` (ex : `rm-04-declarer-trajet.html`). Persona-id = `rm` rameneur, `ac` acheteur, `pr` producteur.
- **Décisions** : datées en ISO (YYYY-MM-DD), une ligne par décision avec contexte court.
- **Versions** : pas de suffixe `_v1` sur les fichiers vivants. Si un document est figé (ex: PRD à un instant T), créer un dossier `archives/` plutôt que renommer.
- **Messages de commit** : phrase courte en français, forme "Verbe + objet" sans préfixe conventionnel (`feat:`, `chore:`, etc.). Exemples : `Ajout du fichier DESIGN.md`, `Mise à jour de CLAUDE.md`, `Archivage des user stories`.
- **Responsive obligatoire** : toute maquette ou écran doit être conçu pour desktop ET mobile. Pas de mobile-first ni de desktop-first — les deux déclinaisons sont livrées systématiquement. Les breakpoints de référence sont définis dans `DESIGN.md`.

## Workflow obligatoire

Règles à respecter sans qu'elles soient rappelées à chaque demande.

### Avant toute modification produit
- Lire `produit/decisions/decisions_produit.md` pour vérifier qu'aucune décision antérieure n'est contredite
- Si contradiction détectée : la pointer explicitement avant de proposer le changement
- Vérifier que le sujet n'est pas dans "Hors scope MVP" ; si oui, le rappeler avant d'aller plus loin

### Après toute décision validée
- Ajouter une entrée datée dans `produit/decisions/decisions_produit.md` (format : `YYYY-MM-DD — décision — contexte court`)
- Si la décision invalide une ancienne : marquer l'ancienne `[SUPERSEDED YYYY-MM-DD — voir <nouvelle entrée>]` au lieu de la supprimer
- Mettre à jour le résumé "Décisions clés" du `CLAUDE.md` si la décision est structurante
- Mettre à jour le PRD (`PRD.md`) si la décision contredit son contenu

### Après toute création, modification ou suppression de ticket Jira — règle impérative
Le mapping Jira ↔ repo doit rester en permanence synchronisé avec le projet KAN sur `erkulaws.atlassian.net`. Toute opération sur un ticket entraîne **systématiquement** la mise à jour des fichiers ci-dessous, dans le même commit :

1. **`produit/jira_mapping.md`** (source de vérité) :
   - Ajouter / éditer / retirer la ligne du ticket dans la section "Catalogue Jira complet" (table de l'épic concerné)
   - Si le ticket touche un écran existant, mettre à jour la table "Mapping écran ↔ ticket(s) Jira" du parcours correspondant (Producteur / Acheteur / Rameneur / Transverse)
   - Mettre à jour le compteur de la section "Vue d'ensemble" (nombre d'épics / features / subtasks) et la date d'état
2. **PRD §10 (sitemap)** : si l'écran est listé dans 10.2 / 10.3 / 10.4 / 10.5, mettre à jour sa colonne "Ticket(s) Jira"
3. **Maquettes HTML** : si une maquette existe pour cet écran (`design/maquettes/[persona]/[id]-[slug].html`), mettre à jour le commentaire `<!-- Ticket(s) Jira : ... -->` en tête de fichier
4. **Aucune référence orpheline** : en cas de suppression ou fusion de ticket, retirer ou rediriger toutes les mentions de l'ancien ID dans les trois emplacements ci-dessus
5. **Commit dédié** au mapping, message type : `Mapping Jira : ajout KAN-XX (résumé court)` ou `Mapping Jira : suppression KAN-XX (raison)`. Ne pas mélanger avec d'autres modifications produit.

### Avant de créer une maquette
- Vérifier la nomenclature `[persona-id]-[slug].html` (rm / ac / pr)
- Confirmer que l'écran est listé dans le sitemap PRD §10 ; sinon, l'ajouter d'abord
- Ranger dans `design/maquettes/[persona]/`

### Avant de créer un nouveau fichier de doc
- Demander confirmation si le fichier crée un nouveau dossier de premier niveau
- Privilégier l'ajout dans un fichier existant plutôt que la fragmentation
- Pas de suffixe `_v1`, `_final`, etc. sur les fichiers vivants

### Modifications de `PRD.md` — règle impérative
Le PRD est la source de vérité fonctionnelle du produit. Toute modification, quelle qu'elle soit (ajout, suppression, refonte, correction), doit être consignée dans la table changelog **§16.4** du PRD dans le même commit.

- Ajouter une ligne au changelog avec : version (incrément mineur en `X.Y` sauf refonte structurelle qui passe à `X+1.0`), date ISO `YYYY-MM-DD`, résumé concis listant les sections touchées et la nature du changement
- Format : `| X.Y | YYYY-MM-DD | <résumé> |`
- Grouper les corrections mineures (typos, liens, reformulations) du même jour sous une seule entrée plutôt que multiplier les lignes
- Si la modification est déclenchée par une décision produit, citer la date de la décision dans le résumé et garder cohérent avec `produit/decisions/decisions_produit.md`
- Ne jamais éditer le PRD sans mettre à jour le changelog dans le même commit

### Modifications de `DESIGN.md` — règle impérative
`DESIGN.md` est la source de vérité du design system et doit toujours être synchronisé avec le dépôt distant.

**Avant toute modification :**
- Présenter les changements envisagés (tokens, règles, composants) et obtenir une **confirmation explicite** avant d'éditer le fichier.

**Après chaque modification confirmée et appliquée :**
- Faire un `git add DESIGN.md && git commit -m "design: <description courte>" && git push origin main` immédiatement.
- Ne jamais laisser une modification de `DESIGN.md` non commitée ou non poussée.

### Modifications de `ARCHITECTURE.md` — règle impérative
`ARCHITECTURE.md` est la source de vérité technique du projet. Toute évolution structurante (changement de stack, nouvelle convention, ajout d'une couche) doit être consignée dans la table journal **§18** du fichier dans le même commit.

- Ajouter une ligne au journal §18 : version (incrément mineur en `X.Y`, ou `X+1.0` si refonte), date ISO `YYYY-MM-DD`, résumé concis listant les sections touchées et la nature du changement
- Format : `| X.Y | YYYY-MM-DD | <résumé> |`
- Grouper les corrections mineures (typos, reformulations) du même jour sous une seule entrée
- Distinguer décisions techniques (journal §18 d'`ARCHITECTURE.md`) et décisions produit (`produit/decisions/decisions_produit.md`) — ne jamais mélanger
- Ne jamais éditer `ARCHITECTURE.md` sans mettre à jour le journal §18 dans le même commit

### Cadrage technique d'une feature Jira — skill `propose-spec`
Pour préparer techniquement une feature Jira KAN avant de coder, utiliser le skill `propose-spec` (slash command `/propose KAN-XXX`). Il génère trois fichiers Markdown courts dans `specs/KAN-XXX/` (proposal, design, tasks), met à jour le ticket Jira (commentaire + lien + transition To Do) et synchronise `produit/jira_mapping.md`.

- Source unique de vérité : le contenu des specs vit dans `specs/KAN-XXX/`. Jira et le mapping ne contiennent que des **liens** vers ces fichiers — jamais de copie du contenu.
- Option A retenue : Jira reste maître des tâches livrables (subtasks). `tasks.md` ne contient que des tâches techniques internes (setup, refacto, migrations, helpers) qui n'ont pas vocation à être trackées comme livrables produit.
- Pas de slug dans le nom du dossier : `specs/KAN-XXX/`, pas `specs/KAN-XXX-slug/`.
- Définition complète et workflow : `.claude/skills/propose-spec/SKILL.md`.

### Hiérarchie en cas de conflit entre sources
**Sur sujets produit / fonctionnels :**
1. `produit/decisions/decisions_produit.md` (dernière entrée datée)
2. Logique "rameneur initiateur" (flip vs PRD)
3. PRD (`PRD.md`)
4. Cahier des charges initial (historique seulement, ne pas s'y appuyer pour trancher)

**Sur sujets techniques (stack, structure code, conventions, infra) :**
1. `ARCHITECTURE.md` — journal §18 (dernière entrée datée) puis sections normatives
2. `DESIGN.md` pour tout ce qui touche au design system et aux tokens visuels

## Garde-fous produit

À chaque proposition de feature, vérifier silencieusement :

- Compatible avec "rameneur = initiateur" ? (sinon flag rouge explicite)
- Dans le scope MVP ? (sinon proposer report post-MVP, ne pas l'inclure par défaut)
- Cohérent avec les piliers PRD : Confiance d'abord, Simplicité rameneur, Local d'abord ?
- Implication paiement → escrow Stripe respecté, pas de cash réintroduit ?
- Implication produit frais / chaîne du froid → bloquer et le dire
- Implication multi-producteurs par mission → bloquer (hors scope MVP)
- Une exigence légale / RGPD est-elle touchée (rôle marketplace, données producteur/acheteur) ?

## Style d'aide attendu

- Pousser back quand un choix produit semble incohérent avec ce qu'on a déjà décidé
- Rappeler les principes du PRD quand un arbitrage les ignore (Confiance d'abord, Simplicité rameneur, etc.)
- Expliciter les trade-offs avant de recommander
- Ne pas hésiter à proposer des alternatives même quand l'utilisateur a une idée précise — il décide en dernier
- Mettre à jour `produit/decisions/decisions_produit.md` à chaque arbitrage validé

## Personas (rappel)

- **Producteur** : agriculteur, artisan, petit transformateur. Vend ses produits sur Delta. Desktop et mobile.
- **Acheteur** : citadin, sensible au local et au bio, souvent sans voiture. Desktop et mobile.
- **Rameneur** : particulier qui fait des trajets réguliers ou ponctuels (navetteurs, étudiants, week-ends en famille). Desktop et mobile. Persona limitant — sans rameneurs, pas de plateforme.

## Glossaire

| Terme | Définition |
|-------|-----------|
| Rameneur | Particulier qui transporte des produits sur un trajet existant |
| Mission | Une opération complète : récupération chez un producteur + livraison à 1+ acheteurs |
| Opportunité | Mission proposée à un rameneur sur la base de son trajet déclaré |
| Wishlist / envie | Produit qu'un acheteur souhaite obtenir, sans paiement préalable |
| Escrow | Mécanisme Stripe qui retient le paiement jusqu'à confirmation de livraison |
| Pickup | Récupération du produit par le rameneur chez le producteur |
| Delivery | Remise du produit par le rameneur à un acheteur |
