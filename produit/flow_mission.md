# Flow Mission — Cycle de vie d'une livraison

**Version** : v1 — 2026-05-01
**Statut** : Validé pour MVP

Ce document décrit le **cycle de vie complet d'une mission** depuis la déclaration de trajet du rameneur jusqu'à la libération des paiements. C'est la mécanique centrale de Delta.

---

## Acteurs et rôles

- **Producteur** : détient le stock, remet le produit au rameneur contre QR scan
- **Rameneur** : initie la mission, transporte, livre
- **Acheteur** : a une envie en wishlist, confirme et paie quand un rameneur propose
- **Plateforme (Delta)** : matche, encaisse l'escrow, libère les paiements à confirmation

---

## Modèle de paiement (Option B — escrow Stripe)

1. L'acheteur confirme la mission → paiement intégral via Stripe au moment de la confirmation
2. Les fonds sont gardés en **escrow** sur le compte plateforme Stripe Connect
3. Aucun paiement n'est libéré tant que la livraison n'est pas confirmée par QR
4. À confirmation finale : split automatique **85 % producteur / 10 % rameneur / 5 % plateforme**
5. En cas d'échec mission : remboursement intégral acheteur, aucun versement producteur ni rameneur

---

## Mécanique QR codes (Option 3)

Le produit physique ne déclenche jamais de paiement direct entre acteurs. Les QR codes servent à **horodater** les remises et à **prouver** la chaîne de responsabilité.

| Étape | QR scanné par | Effet |
|-------|---------------|-------|
| Pickup chez producteur | Le producteur scanne le QR du rameneur | Mission passe à l'état `picked_up` ; producteur attesté de la remise |
| Delivery chez acheteur | L'acheteur scanne le QR du rameneur (ou inverse) | Livraison individuelle confirmée ; à la dernière, capture Stripe + split |

Le QR contient un identifiant signé propre à la mission, valide uniquement aux étapes prévues, à usage unique côté delivery.

---

## Machine à états d'une mission

```
[draft]
   │  rameneur déclare trajet + sélectionne opportunité
   ▼
[reserved]                  ← exclusif, autres rameneurs ne voient plus
   │  notifications envoyées aux acheteurs matchés
   ▼
[awaiting_buyers]           ← timer 24h
   │  ├─ aucun acheteur confirme dans le délai
   │  │     └─→ [cancelled_no_buyer] (rameneur libéré)
   │  └─ ≥ 1 acheteur confirme et paie (escrow)
   ▼
[confirmed]                 ← QR pickup généré pour rameneur
   │  rameneur arrive chez producteur, scan QR
   │  ├─ rameneur ou producteur signale rupture stock
   │  │     └─→ [cancelled_no_stock] (remboursement intégral acheteurs)
   ▼
[picked_up]                 ← QR delivery activé pour chaque acheteur
   │  rameneur livre acheteur 1, scan QR
   │  rameneur livre acheteur N, scan QR
   ▼
[delivered]                 ← capture Stripe + split 85/10/5
   │
   ▼
[closed]                    ← invitations notation
```

---

## Cas limites et règles de gestion

### Annulation par un acheteur

| Moment | Conséquence |
|--------|-------------|
| Avant mission `confirmed` | Remboursement intégral, mission revient à `awaiting_buyers` si possible |
| Après `confirmed`, avant `picked_up` | Remboursement intégral, mission peut continuer si autres acheteurs présents |
| Après `picked_up` | Pas de remboursement automatique : produit déjà collecté. Cas litige. |

### Producteur sans stock à l'arrivée

- État `cancelled_no_stock`
- Remboursement intégral acheteurs
- Pas de pénalité rameneur (il s'est déplacé)
- Compensation rameneur via plateforme à étudier (forfait dédommagement ?)
- Pénalité producteur (suspension temporaire si répétition)

### Rameneur abandonne en route

- Notification immédiate aux acheteurs et producteur
- Tentative de rematching urgent (24 h)
- À défaut : remboursement intégral, mission `cancelled_rameneur_dropout`
- Pénalité rameneur (suspension après 2 abandons)

### Acheteur lapin (no-show à la livraison)

- Rameneur signale via app après 30 min d'attente au point de RDV
- Délai de grâce 24 h (rameneur garde le produit, contact acheteur)
- Si toujours pas de récupération sous 48 h : capture Stripe en faveur du rameneur **et** du producteur (chacun a fait son travail), pas de remboursement acheteur
- L'acheteur reste propriétaire moral du produit mais le rameneur n'a pas obligation de le garder indéfiniment (à clarifier dans CGV)

### Conflit deux rameneurs sur même opportunité

- Premier qui clique « Réserver » verrouille la mission
- L'autre voit l'opportunité disparaître de sa liste
- Pas de mécanisme d'enchère ou de file d'attente en MVP

---

## Décisions validées (récapitulatif)

| Sujet | Choix |
|-------|-------|
| Modèle paiement | Option B — escrow à la réservation, libération à la livraison |
| Mécanique remise | Option 3 — QR codes pickup et delivery |
| Réservation mission | Exclusive, premier arrivé premier servi |
| Wishlist acheteur | Privée en v1 (matching côté serveur uniquement) |
| Lieu de remise final | Flexible — accord direct entre parties via chat |
| Multi-producteurs / mission | Non en MVP (1 producteur = 1 mission) |
| Capacité véhicule rameneur | Déclaration qualitative : sac / coffre / break |

---

## Décisions ouvertes (à trancher avant développement)

- Seuil minimum d'acheteurs ou de montant pour qu'une mission soit confirmée (sinon annulation auto)
- Délai de pré-autorisation paiement acheteur (24h proposé)
- Politique de compensation rameneur en cas de rupture stock producteur
- Règles précises de no-show acheteur (durée de grâce, sort du produit)
- Politique de pénalité (suspension automatique après X abandons)
