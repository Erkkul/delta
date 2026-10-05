# Notes d'implémentation — KAN-32

## Option A retenue (modèle de données)

Comme recommandé dans `design.md` : pas de table d'audit trail dédiée. Le
comptage des refus se fait à la volée sur `mission_buyers` (nouvel index
partiel `mission_buyers_buyer_declined_responded_idx`), et la suspension
est une simple colonne `users.suspended_until`.

## Seuils et durée de suspension — toujours non validés par le produit

`proposal.md` § Hypothèses signalait ce point comme bloquant : D7 dit
elle-même "seuils précis à finaliser". L'implémentation câble les valeurs
littérales de D7 (2e refus = avertissement, 3e = suspension) avec une durée
de suspension de 14 jours (hypothèse de travail, non présente dans D7).
Même posture que KAN-31 pour son délai de confirmation de 24h : valeur
PROPOSÉE câblée en attendant l'arbitrage produit, documentée en plusieurs
endroits (migration SQL, `compute-buyer-penalty-outcome.ts`,
ARCHITECTURE.md §18 entrée 1.30) pour qu'un futur changement de seuil soit
facile à localiser.

**À escalader avant mise en production** : la durée de 14 jours n'a reçu
aucune validation produit, contrairement aux seuils 2e/3e refus qui sont au
moins écrits dans D7.

## RLS plus stricte que prévu par design.md — nécessité, pas choix

`design.md` ne mentionnait pas explicitement la suppression de la policy
`mission_buyers_update_self`. Elle s'est avérée nécessaire en cours
d'implémentation : si le refus continuait à passer par un UPDATE self
direct (comme dans KAN-31), rien n'empêchait un client d'écrire
`status = 'declined'` par un PATCH REST direct sur la table, contournant
entièrement le comptage de pénalité introduit par la RPC
`decline_mission_match`. La policy est donc supprimée et les deux
transitions (accept/decline) passent exclusivement par des fonctions RPC
SECURITY DEFINER. Documenté dans ARCHITECTURE.md §18 entrée 1.30 et dans
`supabase/policies/mission_buyers.sql`.

## UI non traitée — aucune maquette dédiée

Confirmé en cadrage (`design.md` § État UI) : `ac-07-notification-match.html`
référence KAN-32 en en-tête mais ne matérialise aucun élément de pénalité.
Aucun écran n'a été créé ni improvisé. Deux pistes restent à maquetter si
le produit les souhaite :
- Un message d'avertissement au moment du refus (2e refus de la fenêtre)
- Un indicateur de statut de compte suspendu (profil AC-11, ou message
  d'erreur à la tentative de confirmation bloquée par `P0005` /
  `MISSION_MATCH_BUYER_SUSPENDED`)

Le centre de notifications (TR-02, "à maquetter") n'existant pas non plus,
les notifications `buyer_penalty_warning` / `buyer_penalty_suspended`
écrites dans `notifications` ne sont aujourd'hui visibles par aucun écran
— même limite déjà acceptée pour la notification `confirmation_requested`
de KAN-31.
