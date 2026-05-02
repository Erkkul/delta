# Delta — Contexte projet pour Claude

Charge ce fichier à l'ouverture du projet pour comprendre rapidement où on en est. Les détails sont dans les documents référencés ci-dessous, ne les recopie pas ici.

---

## Le projet en 30 secondes

**Delta** (nom de code provisoire) est une plateforme qui met en relation **producteurs locaux**, **acheteurs urbains** et **rameneurs** (particuliers en déplacement) pour acheminer des produits locaux via des trajets déjà existants. Pilote sur l'axe **Normandie ↔ Paris**.

**Valeur unique** : utiliser des trajets que les gens font de toute façon, plutôt que créer une nouvelle logistique. Trois bénéfices : juste rémunération producteur, accessibilité urbaine, réduction CO₂.

## Statut

- **Phase** : conception produit, pré-développement
- **Maquettes** : parcours rameneur (RM-04, RM-05, RM-06, RM-08) et parcours producteur (PR-04, PR-05, PR-06) posés. Reste à faire le parcours acheteur.
- **Décisions structurantes** : prises (voir ci-dessous)
- **Backlog** : structuré sur Jira (erkulaws.atlassian.net, projet KAN) — épics, features et subtasks créés pour l'ensemble du MVP
- **Code** : pas commencé

## Modèle d'expérience (important — flip vs PRD initial)

Le **rameneur est l'initiateur** de la transaction, pas le système. Il déclare un trajet, le système calcule en arrière-plan les opportunités combinant producteurs côté destination + voisins demandeurs côté origine, le rameneur réserve une mission. Logique inverse d'un Deliveroo classique. Si Claude trouve une contradiction entre le PRD original et cette logique, **cette logique prime** (le PRD sera mis à jour).

## Où trouver quoi

| Question | Document |
|----------|----------|
| Vision, marché, positionnement, contexte | `vision/PRD.md` |
| Étude de marché chiffrée | `vision/etude_marche.md` |
| Cahier des charges initial (historique) | `vision/cahier_des_charges.pdf` |
| Carte des écrans MVP | `produit/sitemap.md` |
| Cycle de vie d'une mission, machine à états, paiement, QR codes | `produit/flow_mission.md` |
| Backlog MVP (épics, features, subtasks) | Jira KAN — erkulaws.atlassian.net |
| User stories archivées (référence, non maintenu) | `produit/archives/user_stories_v2_2026-05-02.md` |
| Roadmap dev par phase et sprint | `produit/roadmap.md` |
| Journal des arbitrages produit (avec dates) | `produit/decisions/decisions_produit.md` |
| Maquettes HTML cliquables | `design/maquettes/rameneur/` |

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

## Hors scope MVP (pour ne pas réintroduire)

- Produits frais / chaîne du froid
- Multi-producteurs par mission
- Wishlist publique / carte de la demande
- Wallet interne / cashback
- Matching algorithmique automatique commande → rameneur

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
- Mettre à jour le PRD (`vision/PRD.md`) si la décision contredit son contenu

### Avant de créer une maquette
- Vérifier la nomenclature `[persona-id]-[slug].html` (rm / ac / pr)
- Confirmer que l'écran est listé dans `produit/sitemap.md` ; sinon, mettre à jour le sitemap d'abord
- Ranger dans `design/maquettes/[persona]/`

### Avant de créer un nouveau fichier de doc
- Demander confirmation si le fichier crée un nouveau dossier de premier niveau
- Privilégier l'ajout dans un fichier existant plutôt que la fragmentation
- Pas de suffixe `_v1`, `_final`, etc. sur les fichiers vivants

### Modifications de `DESIGN.md` — règle impérative
`DESIGN.md` est la source de vérité du design system et doit toujours être synchronisé avec le dépôt distant.

**Avant toute modification :**
- Présenter les changements envisagés (tokens, règles, composants) et obtenir une **confirmation explicite** avant d'éditer le fichier.

**Après chaque modification confirmée et appliquée :**
- Faire un `git add DESIGN.md && git commit -m "design: <description courte>" && git push origin main` immédiatement.
- Ne jamais laisser une modification de `DESIGN.md` non commitée ou non poussée.

### Hiérarchie en cas de conflit entre sources
1. `produit/decisions/decisions_produit.md` (dernière entrée datée)
2. Logique "rameneur initiateur" (flip vs PRD)
3. PRD (`vision/PRD.md`)
4. Cahier des charges initial (historique seulement, ne pas s'y appuyer pour trancher)

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
