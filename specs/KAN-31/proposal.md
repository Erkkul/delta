# Cadrage — KAN-31 Notification & confirmation match

## Liens

- Jira : (ticket supprimé — tout le projet KAN a été vidé le 2026-09-11 ; ce cadrage n'a pas de lien Jira actif. À reconnecter si le ticket est recréé.)
- Epic : KAN-7 — Wishlist & Matching (référence historique, épic supprimée avec le reste du projet)
- Maquette : `design/maquettes/acheteur/ac-07-notification-match.html`
- PRD : §10.3 (sitemap Acheteur, écran AC-07) — non consulté directement, `PRD.md` absent de ce worktree (non versionné)
- ARCHITECTURE : §5 (DB — missions, mission_buyers, notifications), §6 (state machine mission), §7 (matching — opportunities, triggers Inngest), §8 (Stripe — écran adjacent, hors scope), §14 (playbook)

## Pourquoi (côté tech)

Quand un rameneur réserve une mission (écran RM-06, ex-KAN-43 — non livré), les acheteurs dont la wishlist est matchée doivent être notifiés et disposer d'une fenêtre pour confirmer ou refuser leur participation avant que la mission ne passe en `confirmed`. C'est le pont entre la réservation côté rameneur et le paiement côté acheteur (KAN-33/34, hors scope ici).

## Périmètre technique

**In scope :**

- Émission d'une notification acheteur quand sa ligne `mission_buyers` passe en attente de confirmation (outbox `notifications`, canal effectif dépendant de Resend/Expo Push — cf. Risques)
- Écran AC-07 côté lecture : détail du match (produit, producteur, rameneur, timeline, breakdown financier) pour un `mission_buyers` donné
- Action "Confirmer" : transition `mission_buyers.status` → `accepted`, décrémentation du stock réservé pour cet acheteur
- Action "Refuser" : transition `mission_buyers.status` → `declined`, libération du stock, event pour recompute des opportunités concernées
- Timer d'expiration (job Inngest) : si la deadline expire sans confirmation, transition automatique vers refus/expiration
- Countdown temps réel côté UI (calculé depuis une deadline serveur)

**Out of scope (cette US) :**

- Paiement Stripe effectif (création PaymentIntent, capture, escrow) — ex-KAN-33/34
- Pénalités en cas de refus répété (D7, ex-KAN-32)
- Déclaration de trajet, calcul d'opportunités, réservation de mission côté rameneur (ex-KAN-41/42/43) — prérequis fonctionnel non livré à ce jour
- Chat de mission / négociation du point de RDV

## Hypothèses

- **Délai de confirmation non tranché** — `produit/decisions/decisions_produit.md` le liste en "Bloquantes pour développement". Ce cadrage part de la valeur proposée (24h, cohérente avec le countdown "23h47min" de la maquette) mais elle doit être formellement validée avant implémentation.
- **Seuil minimum de confirmation par mission non tranché** — même section decisions_produit.md. Impacte la règle `awaiting_buyers → confirmed` de la state machine (un seul acheteur qui confirme suffit-il si la mission en a plusieurs ?).
- **CTA unique "Confirmer et payer" scindé techniquement** : ce cadrage traite uniquement l'acceptation du match (`mission_buyers.status`) ; le déclenchement du paiement Stripe est délégué à l'écran/domaine paiement (ex-KAN-33). Hypothèse à valider — l'UX veut peut-être un seul appel atomique.
- **Dépendance de séquencement forte** : les tables `trips`, `missions`, `mission_buyers`, `opportunities` n'existent pas encore en DB (aucune feature de l'ex-épic KAN-10/KAN-11 livrée). Ce cadrage ne peut pas être implémenté isolément tant qu'un minimum de ce socle n'existe pas.
- Ticket Jira supprimé : pas de subtasks à rappeler dans `tasks.md`.
