# Cadrage — KAN-32 Pénalités acheteur

## Liens

- Jira : (ticket supprimé — tout le projet KAN a été vidé le 2026-09-11 ; ce cadrage n'a pas de lien Jira actif. À reconnecter si le ticket est recréé.)
- Epic : KAN-7 — Wishlist & Matching (référence historique, épic supprimée avec le reste du projet)
- Maquette : (non disponible — aucune maquette dédiée. `design/maquettes/acheteur/ac-07-notification-match.html` référence KAN-32 en en-tête mais ne matérialise aucun élément UI de pénalité ; le bouton "Refuser cette mission" ne porte aucun avertissement visuel)
- PRD : §10.3 (sitemap Acheteur, écran AC-07) — non consulté directement, `PRD.md` absent de ce worktree (non versionné)
- ARCHITECTURE : §5 (DB — `mission_buyers`, `users`, `notifications`), §6 (state machine mission), §9 (RLS), §14 (playbook)

## Pourquoi (côté tech)

La décision produit D7 (2026-05-01, `produit/decisions/decisions_produit.md`) introduit une pénalité crescendo sur les refus répétés de match côté acheteur : pas de pénalité au 1er refus, avertissement au 2e dans un mois glissant, suspension temporaire à partir du 3e. Objectif : décourager la réservation "pour voir" qui bloque inutilement un rameneur. KAN-31 (AC-07, livré) pose la transition `pending → declined` sur `mission_buyers` mais l'exclut explicitement de son périmètre (`packages/core/src/mission-match/decline-mission-match.ts:9` : "Ne gère PAS les pénalités... hors scope KAN-31"). KAN-32 est le complément direct : compter les refus, déclencher l'avertissement, appliquer la suspension.

## Périmètre technique

**In scope :**

- Mécanisme de comptage des refus par acheteur sur une fenêtre glissante d'un mois (`mission_buyers.responded_at` où `status = 'declined'`)
- Déclenchement d'une notification "avertissement" au 2e refus de la fenêtre (réutilise le mécanisme `notifications` + trigger posé par KAN-31)
- Application d'une suspension temporaire à partir du 3e refus (blocage des nouvelles réservations/confirmations de match pendant la suspension)
- Point d'entrée pour lire le statut de pénalité courant d'un acheteur (nécessaire à l'UI — bannière de restriction, message d'erreur à la tentative de réservation)

**Out of scope (cette US) :**

- Détermination finale des seuils exacts (indiqués "à finaliser" par D7, cf. Hypothèses)
- Pénalités producteur (rupture de stock) ou rameneur (abandon) — item distinct de "Bloquantes pour développement"
- UI dédiée de l'écran AC-07 (pas de maquette existante pour un avertissement visuel au refus) — à cadrer séparément si le produit le souhaite
- Levée manuelle de suspension par un rôle support/admin (pas d'espace admin au MVP)
- Notations/réputation (épic KAN-52/53, non livré)

## Hypothèses

- **Seuils non finalisés (bloquant)** : D7 dit elle-même "seuils précis à finaliser". Ce cadrage part de l'énoncé littéral (pas de pénalité au 1er, avertissement au 2e, suspension au 3e, fenêtre d'un mois glissant) mais ces valeurs doivent être validées avant `/implement`.
- **Durée de la suspension non précisée par D7** ("suspension temporaire" sans durée). Hypothèse de travail : durée fixe configurable (ex. 14 jours) plutôt que levée manuelle (pas d'admin au MVP) — à valider.
- **Pas d'audit trail de refus aujourd'hui** : seul le statut courant de `mission_buyers` est conservé (`declined`/`responded_at`), pas d'historique distinct. Le comptage sur fenêtre glissante peut s'appuyer sur une requête directe plutôt qu'une table de compteur dédiée — arbitrage détaillé en design.md.
- **Pas de ticket Jira actif** : suivi en pause depuis 2026-09-11. Pas de subtasks à rappeler dans `tasks.md`.
- **Dépendance de séquencement** : KAN-32 présuppose KAN-31 (livré, `mission_buyers` existe) — aucun autre prérequis bloquant côté DB.
