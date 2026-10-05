# Conception technique — KAN-32 Pénalités acheteur

## Vue d'ensemble

Le mouvement principal est une couche de règles pures côté `packages/core` (calcul du statut de pénalité à partir de l'historique de refus) posée au-dessus de l'existant KAN-31, plus une migration DB minimale pour matérialiser la suspension (le compteur de refus restant calculable à la volée, sans nouvelle table — cf. Modèle de données). Le point d'intégration est le flux de refus (`declineMissionMatch`) et tout flux futur de réservation/confirmation qui doit vérifier l'absence de suspension active avant d'autoriser l'action.

## Packages touchés

- [ ] `packages/contracts` — pas de nouveau contrat API dédié a priori — à confirmer
- [x] `packages/core` — `computeBuyerPenaltyStatus` (comptage fenêtre glissante + détermination avertissement/suspension), hook dans `declineMissionMatch`
- [x] `packages/db` — requête de comptage des refus, colonne(s) de suspension sur `users`
- [ ] `apps/web` — pas d'écran dédié identifié (pas de maquette) ; a minima message d'erreur si action bloquée
- [ ] `apps/mobile` — idem web
- [ ] `packages/jobs` — notification réutilise le trigger DB existant ; pas de nouveau job Inngest a priori
- [x] `supabase/migrations` — colonne(s) de suspension + éventuel trigger de notification
- [x] `supabase/policies` — RLS sur la/les nouvelle(s) colonne(s)
- [ ] `packages/ui-web` ou `packages/ui-mobile` — aucun composant partagé nouveau identifié

## Modèle de données

Deux options à trancher avant implémentation :

**Option A — calcul à la volée (recommandée au MVP) :**

- Comptage par requête sur `mission_buyers` existant : `COUNT(*) WHERE buyer_id = $1 AND status = 'declined' AND responded_at > now() - interval '1 month'`
- Seule addition DB : colonne `suspended_until timestamptz` (nullable) sur `users` (aujourd'hui aucune colonne de statut/suspension, cf. `supabase/migrations/20260512090000_create_users.sql:55-63`)
- RLS : lecture self (`auth.uid() = id`), écriture réservée à une fonction `SECURITY DEFINER` dédiée (pattern posé par KAN-31, `confirm_mission_match`) — un acheteur ne doit pas pouvoir lever sa propre suspension

**Option B — table dédiée `buyer_penalty_events` :**

- Audit trail explicite, plus traçable pour le support / un futur écran "historique de pénalité"
- Coût : une table + migration de plus, écriture légèrement plus complexe

Recommandation : **Option A** au MVP (cohérent avec la posture "pas d'infrastructure en avance de besoin" déjà appliquée sur KAN-28/30/31). Option B à reconsidérer si un écran de transparence pénalité est demandé.

## API / Endpoints

Pas de nouvel endpoint identifié à ce stade — le statut de pénalité est consommé en interne par le flux de refus existant et par un futur flux de réservation (hors scope tant que KAN-41/42/43 ne sont pas livrés). Si le produit demande un affichage explicite côté profil acheteur (AC-11), un endpoint de lecture léger sera nécessaire — à confirmer avant `/implement`.

## Impact state machine / events

Aucune nouvelle transition sur `missions`/`mission_buyers`. Le hook se fait en aval de la transition existante `pending → declined` : après écriture, vérifier le compteur et, le cas échéant, écrire la suspension + déclencher la notification dans la même opération (pattern RPC `SECURITY DEFINER` atomique, cf. ARCHITECTURE.md §18 entrée 1.29). Toute action future de réservation devra lire `users.suspended_until` avant d'autoriser l'action acheteur.

## Dépendances

Aucun nouveau service externe. Réutilise Supabase Postgres et le mécanisme de notification trigger-based posé par KAN-31 (pas d'event Inngest, cf. `tech/setup.md` ligne 132). Si une levée automatique de suspension au-delà d'une simple comparaison `now() > suspended_until` était nécessaire, un job Inngest cron pourrait s'inspirer de `expire-pending-mission-matches` (KAN-31) — mais probablement superflu avec une date de fin.

## État UI

Aucune maquette dédiée. `ac-07-notification-match.html` référence KAN-32 en en-tête mais ne matérialise rien autour du bouton "Refuser cette mission". Deux pistes non maquettées à signaler au produit avant implémentation : un message d'avertissement au moment du refus, et un indicateur de statut de compte suspendu (AC-11 ou message d'erreur). Pas d'implémentation UI à l'aveugle (CLAUDE.md § "Avant d'écrire ou modifier une UI").

## Risques techniques

- Seuils D7 non finalisés — risque de retouche après implémentation
- Fenêtre glissante calculée par requête : coût négligeable au volume MVP, surveiller l'indexation (`buyer_id, status, responded_at`) si le volume croît
- Risque UX : bloquer un acheteur suspendu sans message clair dégrade la confiance (pilier PRD "Confiance d'abord")

## Tests envisagés

- Unit `packages/core` : 1er refus (aucun effet), 2e (avertissement), 3e (suspension), refus hors fenêtre (reset), refus pendant suspension active
- Unit/integration `packages/db` : requête de comptage, écriture `suspended_until` via la fonction SECURITY DEFINER
- Contracts : si un contrat de lecture de statut est ajouté

## Implémenté (2026-10-05) — écarts par rapport au cadrage ci-dessus

Détail complet : migration `supabase/migrations/20261005120000_buyer_penalty.sql`,
ARCHITECTURE.md §18 entrée 1.30, `specs/KAN-32/notes.md`.

Écarts constatés en implémentant, par rapport aux sections ci-dessus :

- **Option A confirmée** (modèle de données) : pas d'écart, mise en œuvre
  telle que recommandée.
- **Comptage + décision factorisés en fonction core pure** — pas prévu
  explicitement ci-dessus (la section Packages touchés mentionnait un hook
  dans `declineMissionMatch` sans préciser la forme). `computeBuyerPenaltyOutcome`
  / `isBuyerSuspended` (`packages/core/src/mission-match/compute-buyer-penalty-outcome.ts`)
  documentent et testent la règle de seuil ; la fenêtre glissante elle-même
  reste calculée côté SQL (atomicité), dupliquée avec cross-référence en
  commentaire plutôt que partagée (impossible entre SQL et TS).
- **Suppression de la policy `mission_buyers_update_self`** — non anticipée
  dans "RLS sur la/les nouvelle(s) colonne(s)" ci-dessus, qui ne parlait que
  de `users`. S'est avérée nécessaire : sans elle, un client pouvait
  continuer à décliner un match par UPDATE self direct (chemin KAN-31),
  contournant le comptage de pénalité. Les deux transitions passent
  maintenant exclusivement par des RPC SECURITY DEFINER. Cf. notes.md.
- **Decline devient une RPC** (comme confirm) plutôt qu'un UPDATE
  conditionnel côté repo : nécessaire pour l'atomicité comptage + écriture
  pénalité + notification (§ Impact state machine / events ci-dessus
  l'anticipait sans préciser que cela changerait le mécanisme `decline`
  lui-même, pas seulement `confirm`).
- **Pas de nouvel endpoint, confirmé** : `confirm_mission_match` existant
  étend simplement son gate (nouveau code d'erreur `P0005`
  `MISSION_MATCH_BUYER_SUSPENDED`, mappé en HTTP 403).
- **Aucune UI implémentée**, conformément à la section État UI — signalé
  dans notes.md plutôt qu'improvisé.
