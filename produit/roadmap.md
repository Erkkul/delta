
# Roadmap Produit MVP - Plateforme de Produits Locaux

## Vue d'ensemble
**Durée estimée totale**: 4-5 mois  
**Déploiement**: National, tous axes ruraux-urbains  
**Objectif**: Lancer une plateforme fonctionnelle permettant de relier vendeurs locaux, acheteurs urbains et rameneurs particuliers

---

## Phase 0 : Fondations (3-4 semaines)

### Objectif
Poser les bases techniques et légales du projet

### Livrables

**Infrastructure technique**
- Configuration AWS (Lambda, API Gateway, DynamoDB)
- Architecture serverless de base
- Environnements dev/staging/production
- CI/CD basique

**Légal & Administratif**
- Rédaction CGU/CGV (rôle de mise en relation)
- Conformité RGPD (consentement, minimisation données)
- Configuration Stripe Connect Standard
- Choix statut juridique plateforme

**Design & UX**
- Définition charte graphique (couleurs, logo, ton)
- Wireframes des parcours utilisateurs principaux
- Design system mobile (iOS/Android)

---

## Phase 1 : Parcours Vendeur & Acheteur (6-7 semaines)

### Objectif
Permettre aux vendeurs de mettre en ligne leurs produits et aux acheteurs de les découvrir

### Sprint 1 : Gestion des comptes (2 semaines)

**Vendeur**
- Création de compte vendeur (email, mot de passe, nom, région)
- Validation légère (email confirmé)
- Profil vendeur (description, photo, localisation zone)

**Acheteur**
- Création de compte acheteur
- Profil basique (nom, email, adresse livraison)

**Technique**
- API authentification (JWT)
- Base de données utilisateurs
- Envoi emails transactionnels

### Sprint 2 : Catalogue produits (2 semaines)

**Vendeur**
- Ajout de produit (nom, description, photo, prix, catégorie)
- Types autorisés : produits secs + agricoles non sensibles
- Édition/suppression produits
- Gestion de disponibilité simple (actif/inactif)

**Acheteur**
- Page d'accueil avec liste produits
- Fiche produit détaillée
- Filtres de base (type produit, région, prix)

**Technique**
- Upload et stockage images (S3)
- API CRUD produits
- Système de catégorisation

### Sprint 3 : Système de commande (2-3 semaines)

**Acheteur**
- Panier d'achat
- Récapitulatif commande
- Paiement sécurisé Stripe Connect
- Confirmation commande

**Vendeur**
- Réception notification nouvelle commande
- Tableau de bord commandes reçues
- Statuts commandes (en attente, confirmée, expédiée, livrée)

**Technique**
- Intégration Stripe Connect Standard (KYC basique)
- Gestion transactions et répartition (85% vendeur / 5% plateforme)
- Webhooks Stripe
- Emails de confirmation

---

## Phase 2 : Intégration Rameneur & Matching (5-6 semaines)

### Objectif
Activer le rôle clé de rameneur et automatiser le matching

### Sprint 4 : Parcours Rameneur (2 semaines)

**Rameneur**
- Création compte rameneur
- Profil simple (pas de documents requis MVP)
- Définition rayon géographique (5-20 km)
- Indication disponibilités (jours/horaires)
- Rémunération libre (suggestion 10% par défaut)

**Technique**
- API profil rameneur
- Géolocalisation zones (pas d'adresses exactes)
- Système de disponibilités

### Sprint 5 : Matching automatique (3 semaines)

**Système de matching**
- Algorithme de matching dynamique vendeur-acheteur-rameneur
- Critères : rayon géographique, disponibilité, capacité
- Attribution automatique du rameneur le plus pertinent
- Notification rameneur (accepter/refuser transport)

**Rameneur**
- Tableau de bord propositions de transport
- Acceptation/refus d'une mission
- Détails du transport (point A → point B, produits, rémunération)

**Acheteur/Vendeur**
- Notification rameneur trouvé
- Informations de contact rameneur (anonymisées)

**Technique**
- Algorithme de matching géographique
- File d'attente de matching (si refus → prochain rameneur)
- Calcul automatique rémunération rameneur (10% du montant)
- Notifications push (iOS/Android)

### Sprint 6 : Communication (1 semaine)

**Tous utilisateurs**
- Chat interne entre vendeur-acheteur-rameneur
- Historique messages par commande
- Notifications messages non lus

**Technique**
- API messagerie temps réel (WebSocket ou polling)
- Stockage messages
- Push notifications

---

## Phase 3 : Finalisation MVP (4-5 semaines)

### Objectif
Compléter l'expérience utilisateur et préparer le lancement

### Sprint 7 : Confiance & Évaluation (2 semaines)

**Tous utilisateurs**
- Notation vendeurs (1-5 étoiles + commentaire)
- Notation rameneurs (1-5 étoiles + commentaire)
- Affichage note moyenne sur profils
- Modération des avis (back-office)

**Acheteur**
- Historique commandes
- Suivi statut livraison
- Téléchargement factures

**Technique**
- Système de notation et avis
- Génération PDF factures
- Notifications push (changement statut)

### Sprint 8 : Back-office (2 semaines)

**Modules administrateur**
- Tableau de bord statistiques (ventes, trajets, revenus)
- Gestion utilisateurs (suspension, validation)
- Gestion produits (validation légère, modération)
- Gestion commandes et transactions
- Support et signalements
- Modération avis
- Logs et audit

**KPIs MVP**
- Nombre de trajets effectués
- Volume produits vendus
- Revenus plateforme
- Nombre d'utilisateurs actifs (vendeurs/acheteurs/rameneurs)
- Taux de satisfaction (notes moyennes)

**Technique**
- Interface admin responsive
- Exports CSV
- Système de signalement

### Sprint 9 : Tests & Polish (1 semaine)

**Tests**
- Tests utilisateurs beta (vraie commande bout en bout)
- Corrections bugs critiques
- Optimisation performances
- Tests de charge

**Documentation**
- Guide vendeur
- Guide rameneur
- Guide acheteur
- FAQ
- Tutoriels vidéo courts

---

## Phase 4 : Lancement Pilote (2 semaines)

### Objectif
Lancer en production avec un groupe limité

**Actions**
- Recrutement 10-15 vendeurs pilotes (territoire à définir)
- Recrutement 20-30 rameneurs sur le territoire de lancement
- Communication locale ciblée
- Lancement progressif (invitation only)
- Support réactif
- Collecte feedbacks quotidiens

**Métriques de succès**
- 50+ commandes sur le premier mois
- Taux de matching > 80%
- Note moyenne > 4/5
- 0 incident critique

---

## Dépendances critiques

### Techniques
1. Stripe Connect → bloque paiement vendeur
2. Géolocalisation → bloque matching
3. Notifications push → impacte UX fortement

### Légales
1. CGU/CGV validées → bloque lancement
2. RGPD → bloque collecte données

### Métier
1. Algorithme matching → cœur de la proposition de valeur
2. Équilibre rémunération (85/10/5) → viabilité économique

---

## Budget temps estimé

| Phase | Durée | Équipe recommandée |
|-------|-------|-------------------|
| Phase 0 | 3-4 semaines | 1 dev backend + 1 dev mobile + 1 designer |
| Phase 1 | 6-7 semaines | 2 devs backend + 2 devs mobile + 1 designer |
| Phase 2 | 5-6 semaines | 2 devs backend + 2 devs mobile |
| Phase 3 | 4-5 semaines | 2 devs backend + 1 dev mobile + 1 QA |
| Phase 4 | 2 semaines | Toute l'équipe + support |

**Total : 20-24 semaines (environ 5-6 mois)**

---

## Post-MVP : Priorités court terme

Une fois le MVP stabilisé (3 mois après lancement), considérer :

1. **Certification rameneurs** (badge, documents obligatoires)
2. **Produits frais** (chaîne du froid)
3. **Web app** (en complément mobile)
4. **Analytics CO₂** (argument écologique mesurable)
5. **Extension géographique** (nouveaux axes ruraux-urbains)

---

## Risques identifiés & mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|-----------|
| Pas assez de rameneurs | Élevé | Moyenne | Campagne recrutement ciblée, incitations financières temporaires |
| Complexité matching | Élevé | Moyenne | Algo simple au départ (rayon fixe), amélioration itérative |
| Problème livraison | Moyen | Moyenne | Chat intégré, process clair, support réactif |
| Paiement Stripe lent | Moyen | Faible | Tests précoces, backup plan manuel temporaire |
| Adoption vendeurs faible | Élevé | Moyenne | Partenariats coopératives agricoles, démo terrain |