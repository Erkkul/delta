# Sitemap MVP — Delta

**Version** : v1.1 — 2026-05-01
**Statut** : Validé pour itération maquettes (mise à jour parcours acheteur)

---

## Vue d'ensemble

Le produit s'organise autour de **3 parcours utilisateurs distincts** et d'un socle d'écrans transverses. Chaque parcours est piloté par un persona principal, avec des points de contact ponctuels avec les autres personas (chat, notation, QR codes).

| Parcours | Persona | Nombre d'écrans MVP |
|----------|---------|---------------------|
| Producteur | Vendeur de produits locaux | 9 |
| Acheteur | Consommateur urbain | 14 |
| Rameneur | Particulier en déplacement | 12 |
| Transverse | Tous | 4 |

---

## Conventions

- **PR-XX** : écran parcours Producteur
- **AC-XX** : écran parcours Acheteur
- **RM-XX** : écran parcours Rameneur
- **TR-XX** : écran Transverse
- Les états (loading, empty, erreur) ne sont pas listés mais doivent être prévus pour chaque écran.

---

## Parcours Producteur

| ID | Écran | Description |
|----|-------|-------------|
| PR-01 | Inscription / connexion | Email + mot de passe, choix du rôle producteur |
| PR-02 | Onboarding Stripe Connect | KYC light + IBAN, redirection Stripe |
| PR-03 | Dashboard | Prochaines récupérations rameneurs + ventes en cours + KPIs simples |
| PR-04 | Catalogue produits | Liste de mes produits avec actions (éditer, désactiver, supprimer) |
| PR-05 | Création / édition produit | Nom, photo, prix, unité, stock, fenêtre de disponibilité, catégorie |
| PR-06 | Récupération à venir | Détail mission rameneur + QR scanner pour confirmer remise produit |
| PR-07 | Historique ventes | Liste des transactions + virements Stripe |
| PR-08 | Profil public producteur | Vue acheteur/rameneur (description, photo, note moyenne) |
| PR-09 | Paramètres compte | Modifier infos, mot de passe, supprimer compte (RGPD) |

---

## Parcours Acheteur

Voir le parcours détaillé dans [`parcours_acheteur.md`](./parcours_acheteur.md) (5 phases : découverte → wishlist → match → réception → notation).

| ID | Écran | Description |
|----|-------|-------------|
| AC-01 | Inscription / connexion | Email + mot de passe, choix du rôle acheteur |
| AC-02 | Onboarding | Zone d'habitation + intérêts catégories (préférences) |
| AC-03 | Accueil | Produits disponibles sur trajets actifs + accès rapide aux envies |
| AC-04 | Catalogue parcourable | Filtres : catégorie, zone d'origine, fenêtre de disponibilité. **Filtré aux produits matchables uniquement.** |
| AC-05 | Fiche produit | Photos, producteur, prix, indicateur match, CTA *« Ajouter à mes envies »* |
| AC-06 | Mes envies (wishlist privée) | Liste des produits désirés (statuts : en attente / probable / matché) |
| AC-07 | Notification de match → confirmation | *« Pierre peut vous ramener du miel jeudi, confirmez sous 24 h »* + récap financier transparent |
| AC-07b | Paiement Stripe | Sous-écran : Stripe Payment Element (CB / Apple Pay / Google Pay) |
| AC-08 | Mes commandes | En cours / à venir / livrées + tracker visuel d'étapes |
| AC-08b | QR delivery (plein écran) | QR code à présenter au rameneur lors de la remise |
| AC-08bis | Profil public producteur (vue acheteur) | Description, photo, note moyenne, autres produits du producteur |
| AC-09 | Historique commandes | Liste des achats passés + factures PDF |
| AC-10 | Évaluation post-livraison | Notation producteur + rameneur (1-5 étoiles + commentaire) |
| AC-11 | Profil + paramètres | Adresses, préférences notifications, moyens de paiement, RGPD |
| AC-12 | Zone non couverte / liste d'attente | État vide AC-04 quand aucun rameneur ne couvre la zone |

---

## Parcours Rameneur

| ID | Écran | Description |
|----|-------|-------------|
| RM-01 | Inscription / connexion | Email + mot de passe, choix du rôle rameneur |
| RM-02 | Onboarding | Stripe Identity (vérif identité légère) + IBAN + zone d'habitation |
| RM-03 | Accueil rameneur | Mes trajets actifs + opportunités à explorer + revenus mois |
| RM-04 | Déclarer un trajet | Origine, destination, date aller, date retour, capacité (sac/coffre/break) |
| RM-05 | Liste des opportunités | Missions calculées sur le trajet, triées par gain net |
| RM-06 | Détail d'une opportunité | Producteur, produits, voisins (anonymisés), gain, détour, CTA *« Réserver »* |
| RM-07 | Mes missions | Liste des missions par statut (en attente / confirmée / en cours / livrée) |
| RM-08 | Mission active | QR pickup chez producteur + liste livraisons + QR delivery par acheteur |
| RM-09 | Chat de mission | Communication avec producteur + chaque acheteur de la mission |
| RM-10 | Historique missions + revenus | Détail des missions passées + virements Stripe |
| RM-11 | Profil rameneur public | Vu par producteurs et acheteurs (note, nombre de missions, ancienneté) |
| RM-12 | Pause / désactivation | Désactivation temporaire du compte (vacances, indisponibilité) |

---

## Écrans transverses

| ID | Écran | Description |
|----|-------|-------------|
| TR-01 | Auth & gestion compte | Mot de passe oublié, modification, suppression RGPD |
| TR-02 | Centre notifications | Liste centralisée des notifications par type |
| TR-03 | Chat par mission | Espace conversation lié à une mission (3 participants max) |
| TR-04 | Signalement / litige | Formulaire de signalement avec catégorisation |

---

## Priorité de design des maquettes

L'ordre suivant est imposé par la **valeur d'apprentissage** : commencer par les écrans qui n'existent nulle part et qui conditionnent l'adoption du produit.

| Sprint design | Écrans | Justification |
|---------------|--------|---------------|
| 1 | RM-04, RM-05, RM-06 | Parcours rameneur — déclarer trajet + voir et réserver opportunités. Aucune maquette existante. Persona limitant. ✅ Fait |
| 2 | RM-08 | Mission active avec QR — moment de vérité opérationnel. ✅ Fait |
| 3 | PR-04 | Catalogue producteur. ✅ Fait |
| 4 | AC-03, AC-05, AC-07, AC-08 | **4 moments-clés du parcours acheteur** : accueil, fiche produit, notif match + paiement, suivi commande. **En cours** |
| 5 | AC-06, AC-04 | Wishlist + catalogue parcourable (compléter porte d'entrée acheteur) |
| 6 | PR-05, PR-06 | Back-office producteur (création produit + récupération QR) |

Les écrans transverses (auth, notifications, chat) seront dessinés en flux continu au fil des autres parcours.

---

## Hors scope MVP (pour mémoire)

- Carte interactive avec géolocalisation visible des trajets
- Wishlist publique / réseau social local
- Multi-producteurs par mission
- Rameneur certifié (badge avec documents obligatoires)
- Produits frais / chaîne du froid
- Wallet interne / cashback
- Filtres avancés (saisonnalité, type d'agriculture, etc.)
