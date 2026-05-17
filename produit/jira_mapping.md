# Mapping Jira ↔ Repo

Source de vérité pour la correspondance entre tickets Jira (projet **KAN**, `erkulaws.atlassian.net`), écrans MVP du PRD §10 et maquettes HTML du dossier `design/maquettes/`.

> Mis à jour automatiquement par les sessions Cowork. Ne pas éditer à la main sans cohérence avec Jira (utiliser `searchJiraIssuesUsingJql`).

## Vue d'ensemble

- **13 épics** (KAN-1, KAN-4 → KAN-15) — un épic par grand domaine fonctionnel
- **50 features cataloguées** (KAN-2, KAN-3 sous KAN-1 ; KAN-16 → KAN-158 sous les autres épics — voir tables par épic ci-dessous)
- **Subtasks** : voir le catalogue par épic ci-dessous. Le mapping peut être incomplet pour les subtasks les plus récentes — Jira fait foi pour la liste exhaustive.
- État au 2026-05-17 : KAN-1 *Examiner* (épic Authentication entièrement livré côté features, à clôturer manuellement si souhaité) ; KAN-2 / KAN-3 / KAN-157 *Terminé* (mergés sur `main` — PRs #2/#3/#4/#5 pour KAN-2, #8 pour KAN-3, #9 pour KAN-157) ; KAN-16 *Terminé* (mergé sur `main` — PR #10, cadrage `specs/KAN-16/`) ; KAN-158 *Terminé* (mergé sur `main` — PR #15, cadrage `specs/KAN-158/`) ; autres *Ideas*
- **Maquettes (2026-05-14)** : les 35 écrans des 3 parcours (Producteur, Acheteur, Rameneur) du sitemap PRD §10 sont maquettés. Restent à maquetter : transverses **TR-02** (centre notifications) et **TR-04** (signalement / litige) ; **TR-03** est couvert par `rm-09-chat.html`. Index navigable de toutes les maquettes : `design/maquettes/index.html`

## Convention de référencement

- Dans une maquette HTML : commentaire `<!-- Ticket(s) Jira : KAN-XX, KAN-YY -->` en tête du fichier
- Dans une branche Git : `kan-XX-slug-court` (ex : `kan-41-declaration-trajet`)
- Dans un message de commit : citer le ticket entre crochets : `[KAN-41] Verbe + objet`
- Dans une PR GitHub : titre + description référencent le(s) ticket(s) ; corps de PR liste les CA cochées

---

## Mapping écran ↔ ticket(s) Jira

### Parcours Producteur (§10.2 PRD)

| Écran | Maquette | Ticket(s) Jira principal(aux) | Tickets liés |
|-------|----------|-------------------------------|--------------|
| PR-01 Inscription / connexion | `pr-01-authentication.html` | KAN-2 (Création de compte), KAN-3 (Connexion), KAN-157 (Récup. mot de passe) | [Cadrage KAN-2](specs/KAN-2/), [Cadrage KAN-3](specs/KAN-3/), [Cadrage KAN-157](specs/KAN-157/) |
| PR-02 Onboarding Stripe Connect | `pr-02-onboarding-stripe.html` | KAN-16 (Onboarding Stripe Connect) — [Cadrage tech](specs/KAN-16/) | KAN-62, KAN-158 (polish UX restricted) |
| PR-03 Dashboard | `pr-03-dashboard.html` | KAN-18 (Tableau de bord producteur) | KAN-56 |
| PR-04 Catalogue produits | `pr-04-catalogue.html` | KAN-20 (Création & édition produit) | KAN-23 (Statuts produit) |
| PR-05 Création / édition produit | `pr-05-edition-produit.html` | KAN-20 (Création & édition produit) | KAN-21 (Photos), KAN-22 (Stock), KAN-24 (Labels & catégories) |
| PR-06 Récupération à venir | `pr-06-recuperation.html` | KAN-46 (QR Pickup), KAN-47 (Checklist remise producteur) | KAN-45 |
| PR-07 Historique ventes | `pr-07-historique-ventes.html` | KAN-19 (Historique ventes) | KAN-36 (Factures PDF) |
| PR-08 Profil public producteur | `pr-08-profil-public.html` | KAN-17 (Informations profil & ferme) — [Cadrage tech](specs/KAN-17/) | KAN-53 (Profils publics & avis), KAN-63, KAN-64, KAN-65, KAN-66 |
| PR-09 Paramètres compte | `pr-09-parametres.html` | KAN-17 (Informations profil & ferme) — [Cadrage tech](specs/KAN-17/) | — |

### Parcours Acheteur (§10.3 PRD)

| Écran | Maquette | Ticket(s) Jira principal(aux) | Tickets liés |
|-------|----------|-------------------------------|--------------|
| AC-01 Inscription / connexion | `ac-01-authentication.html` | KAN-2 (Création de compte), KAN-3 (Connexion), KAN-157 (Récup. mot de passe) | [Cadrage KAN-2](specs/KAN-2/), [Cadrage KAN-3](specs/KAN-3/), [Cadrage KAN-157](specs/KAN-157/) |
| AC-02 Onboarding | `ac-02-onboarding.html` | KAN-25 (Onboarding & zone), KAN-26 (Préférences catégories) | — |
| AC-03 Accueil | `ac-03-accueil.html` | KAN-28 (Catalogue filtré) | — |
| AC-04 Catalogue parcourable | `ac-04-catalogue.html` | KAN-28 (Catalogue filtré) | KAN-29 (Zone non couverte) |
| AC-05 Fiche produit | `ac-05-fiche-produit.html` | KAN-28 (Catalogue filtré) | KAN-30 (Wishlist privée) |
| AC-06 Mes envies | `ac-06-mes-envies.html` | KAN-30 (Wishlist privée) | — |
| AC-07 Notif match → confirmation | `ac-07-notification-match.html` | KAN-31 (Notification & confirmation match) | KAN-32 (Pénalités acheteur) |
| AC-07b Paiement Stripe | `ac-07b-paiement.html` | KAN-33 (Paiement Stripe), KAN-34 (Escrow & libération) | — |
| AC-08 Mes commandes | `ac-08-mes-commandes.html` | KAN-45 (Suivi mission & états) | KAN-55 (Notif in-app) |
| AC-08b QR delivery | `ac-08b-qr-delivery.html` | KAN-48 (QR Delivery) | — |
| AC-08bis Profil public producteur | `ac-08bis-profil-producteur.html` | KAN-53 (Profils publics & avis) | — |
| AC-09 Historique commandes | `ac-09-historique.html` | KAN-27 (Historique commandes) | KAN-36 (Factures PDF) |
| AC-10 Évaluation post-livraison | `ac-10-evaluation.html` | KAN-52 (Notation post-livraison) | — |
| AC-11 Profil + paramètres | `ac-11-profil.html` | KAN-26 (Préférences catégories), KAN-25 (Onboarding & zone) | — |
| AC-12 Zone non couverte | `ac-12-zone-non-couverte.html` | KAN-29 (Zone non couverte & liste d'attente) | — |

### Parcours Rameneur (§10.4 PRD)

| Écran | Maquette | Ticket(s) Jira principal(aux) | Tickets liés |
|-------|----------|-------------------------------|--------------|
| RM-01 Inscription / connexion | `rm-01-authentication.html` | KAN-2 (Création de compte), KAN-3 (Connexion), KAN-157 (Récup. mot de passe) | [Cadrage KAN-2](specs/KAN-2/), [Cadrage KAN-3](specs/KAN-3/), [Cadrage KAN-157](specs/KAN-157/) |
| RM-02 Onboarding | `rm-02-onboarding.html` | KAN-37 (Onboarding & Stripe Identity), KAN-38 (Capacité véhicule) | — |
| RM-03 Accueil rameneur | `rm-03-accueil.html` | KAN-39 (Tableau de bord rameneur) | — |
| RM-04 Déclarer un trajet | `rm-04-declarer-trajet.html` | KAN-41 (Déclaration de trajet) | KAN-38 (Capacité véhicule) |
| RM-05 Liste des opportunités | `rm-05-liste-opportunites.html` | KAN-42 (Calcul & affichage opportunités) | — |
| RM-06 Détail opportunité | `rm-06-detail-opportunite.html` | KAN-43 (Détail & réservation mission) | — |
| RM-07 Mes missions | `rm-07-mes-missions.html` | KAN-44 (Gestion des trajets) | KAN-45 |
| RM-08 Mission active | `rm-08-mission-active.html` | KAN-45 (Suivi mission & états), KAN-46 (QR Pickup), KAN-48 (QR Delivery) | KAN-49 (Cas limites) |
| RM-09 Chat de mission | `rm-09-chat.html` | KAN-50 (Chat par mission) | KAN-51 (Notifs messages) |
| RM-10 Historique missions + revenus | `rm-10-historique-revenus.html` | KAN-39 (Tableau de bord rameneur) | KAN-19 |
| RM-11 Profil rameneur public | `rm-11-profil-public.html` | KAN-53 (Profils publics & avis) | — |
| RM-12 Pause / désactivation | `rm-12-pause.html` | KAN-40 (Pause & désactivation) | — |

### Écrans transverses (§10.5 PRD)

| Écran | Maquette | Ticket(s) Jira principal(aux) | Tickets liés |
|-------|----------|-------------------------------|--------------|
| TR-01 Auth & gestion compte | voir PR-01 / AC-01 / RM-01 | KAN-2 (Création de compte), KAN-3 (Connexion), KAN-157 (Récup. mot de passe) | [Cadrage KAN-2](specs/KAN-2/), [Cadrage KAN-3](specs/KAN-3/), [Cadrage KAN-157](specs/KAN-157/) |
| TR-02 Centre notifications | — *(à maquetter)* | KAN-54 (Notifications push), KAN-55 (Notifications in-app) | KAN-56 |
| TR-03 Chat par mission | voir `rm-09-chat.html` | KAN-50 (Chat par mission) | KAN-51 |
| TR-04 Signalement / litige | — *(à maquetter)* | KAN-60 (Gestion litiges & signalements) | KAN-32 (Pénalités acheteur) |

---

## Catalogue Jira complet (par épic)

### KAN-1 — Authentication

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-1 | Epic | Examiner | Authentication |
| KAN-2 | Feature | Terminé | Création de compte — [Cadrage tech](specs/KAN-2/) — mergé sur main (PRs #2/#3/#4/#5) |
| KAN-3 | Feature | Terminé | Connexion — [Cadrage tech](specs/KAN-3/) — mergé sur main (PR #8) |
| KAN-157 | Feature | Terminé | Récupération de mot de passe — [Cadrage tech](specs/KAN-157/) — mergé sur main (PR #9) |

### KAN-4 — Profil Producteur

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-4 | Epic | Ideas | Profil Producteur |
| KAN-16 | Feature | Terminé | Onboarding Stripe Connect — [Cadrage tech](specs/KAN-16/) — mergé sur main (PR #10) |
| KAN-17 | Feature | À faire | Informations profil & ferme — [Cadrage tech](specs/KAN-17/) |
| KAN-18 | Feature | Ideas | Tableau de bord producteur |
| KAN-19 | Feature | Ideas | Historique ventes |
| KAN-158 | Feature | Terminé | Polish UX onboarding producteur — état Stripe restricted (KYC incomplet) — [Cadrage tech](specs/KAN-158/) — mergé sur main (PR #15) |
| KAN-62 | Subtask | Ideas | Connecter son compte bancaire via Stripe Connect (KYC léger + IBAN) — parent KAN-16 |
| KAN-63 | Subtask | Ideas | Renseigner ses informations de profil (nom, description, photo) — parent KAN-17 |
| KAN-64 | Subtask | Ideas | Renseigner l'adresse exacte de la ferme ou du point de collecte — parent KAN-17 |
| KAN-65 | Subtask | Ideas | Modifier ses informations de profil — parent KAN-17 |
| KAN-66 | Subtask | Ideas | Visualiser son profil public (vue acheteur / rameneur) — parent KAN-17 |

### KAN-5 — Catalogue

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-5 | Epic | Ideas | Catalogue |
| KAN-20 | Feature | Ideas | Création & édition produit |
| KAN-21 | Feature | Ideas | Gestion photos |
| KAN-22 | Feature | Ideas | Stock & alertes |
| KAN-23 | Feature | Ideas | Statuts produit |
| KAN-24 | Feature | Ideas | Labels & catégories |

### KAN-6 — Profil Acheteur

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-6 | Epic | Ideas | Profil Acheteur |
| KAN-25 | Feature | Ideas | Onboarding & zone |
| KAN-26 | Feature | Ideas | Préférences catégories |
| KAN-27 | Feature | Ideas | Historique commandes |

### KAN-7 — Wishlist & Matching

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-7 | Epic | Ideas | Wishlist & Matching |
| KAN-28 | Feature | Ideas | Catalogue filtré |
| KAN-29 | Feature | Ideas | Zone non couverte & liste d'attente |
| KAN-30 | Feature | Ideas | Wishlist privée |
| KAN-31 | Feature | Ideas | Notification & confirmation match |
| KAN-32 | Feature | Ideas | Pénalités acheteur |

### KAN-8 — Paiement

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-8 | Epic | Ideas | Paiement |
| KAN-33 | Feature | Ideas | Paiement Stripe |
| KAN-34 | Feature | Ideas | Escrow & libération |
| KAN-35 | Feature | Ideas | Remboursements & annulations |
| KAN-36 | Feature | Ideas | Factures PDF |

### KAN-9 — Profil Rameneur

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-9 | Epic | Ideas | Profil Rameneur |
| KAN-37 | Feature | Ideas | Onboarding & Stripe Identity |
| KAN-38 | Feature | Ideas | Capacité véhicule |
| KAN-39 | Feature | Ideas | Tableau de bord rameneur |
| KAN-40 | Feature | Ideas | Pause & désactivation |

### KAN-10 — Trajet & Opportunités

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-10 | Epic | Ideas | Trajet & Opportunités |
| KAN-41 | Feature | Ideas | Déclaration de trajet |
| KAN-42 | Feature | Ideas | Calcul & affichage opportunités |
| KAN-43 | Feature | Ideas | Détail & réservation mission |
| KAN-44 | Feature | Ideas | Gestion des trajets |

### KAN-11 — Missions & QR

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-11 | Epic | Ideas | Missions & QR |
| KAN-45 | Feature | Ideas | Suivi mission & états |
| KAN-46 | Feature | Ideas | QR Pickup |
| KAN-47 | Feature | Ideas | Checklist remise producteur |
| KAN-48 | Feature | Ideas | QR Delivery |
| KAN-49 | Feature | Ideas | Gestion cas limites |

### KAN-12 — Chat

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-12 | Epic | Ideas | Chat |
| KAN-50 | Feature | Ideas | Chat par mission |
| KAN-51 | Feature | Ideas | Notifications messages |

### KAN-13 — Notations

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-13 | Epic | Ideas | Notations |
| KAN-52 | Feature | Ideas | Notation post-livraison |
| KAN-53 | Feature | Ideas | Profils publics & avis |

### KAN-14 — Notifications

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-14 | Epic | Ideas | Notifications |
| KAN-54 | Feature | Ideas | Notifications push |
| KAN-55 | Feature | Ideas | Notifications in-app |
| KAN-56 | Feature | Ideas | Alertes stock producteur |

### KAN-15 — Back-office

| Ticket | Type | Statut | Résumé |
|--------|------|--------|--------|
| KAN-15 | Epic | Ideas | Back-office |
| KAN-57 | Feature | Ideas | Tableau de bord & KPIs |
| KAN-58 | Feature | Ideas | Gestion utilisateurs |
| KAN-59 | Feature | Ideas | Modération catalogue |
| KAN-60 | Feature | Ideas | Gestion litiges & signalements |
| KAN-61 | Feature | Ideas | Export données |
