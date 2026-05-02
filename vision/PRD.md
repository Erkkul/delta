# PRD - Plateforme Delta
## Covoiturage de Produits Locaux

> ⚠️ **CE DOCUMENT EST PARTIELLEMENT OBSOLÈTE — dernière revue cohérence : 2026-05-01**
>
> Plusieurs arbitrages produit pris depuis sa rédaction ne sont pas encore reflétés dans le corps du PRD. En particulier :
>
> - **Modèle d'expérience inversé** : le **rameneur est désormais l'initiateur** de la transaction (il déclare un trajet, le système calcule les opportunités). Le PRD décrit encore par endroits une logique "commande acheteur → recherche rameneur" de type Deliveroo, qui n'est plus la cible. **Cette logique inverse prime sur tout passage du PRD qui la contredit.**
> - **Décisions structurantes ultérieures** : modèle de paiement (escrow Stripe Connect), répartition 85/10/5, QR codes pickup/delivery, wishlist privée v1, mission exclusive, un producteur par mission, capacité véhicule qualitative, dates seulement au MVP, produits secs et agricoles non sensibles uniquement, statut juridique marketplace pure.
>
> **Source de vérité en cas de conflit** :
> 1. `produit/decisions/decisions_produit.md` (dernière entrée datée)
> 2. Logique "rameneur initiateur"
> 3. Présent PRD
> 4. Cahier des charges initial (historique seulement)
>
> Les sections de ce PRD seront mises à jour au fil de l'eau ; en attendant, considérer ce bandeau comme prioritaire sur le contenu détaillé.

---

> **Document de référence produit unique** — Consolide et remplace l'étude de marché, les user stories, la roadmap produit et le cahier des charges.

---

# PARTIE A — FONDATIONS STRATÉGIQUES

---

## 1. À propos de ce document

### 1.1 Objectif

Ce PRD est le document de référence produit pour la plateforme Delta. Il décrit **quoi** construire et **pourquoi**, sans prescrire le **comment** technique. Tout choix d'architecture, de framework, de base de données ou d'infrastructure est hors périmètre de ce document.

### 1.2 Audience

| Rôle | Usage du PRD |
|------|-------------|
| Product Owner | Référence pour les arbitrages produit |
| Designers | Parcours utilisateur, personas, sitemap |
| Développeurs | User stories, machine à états, règles métier |
| QA | Critères d'acceptation, cas limites |
| Stakeholders | Vision, roadmap, métriques de succès |

### 1.3 Glossaire

| Terme | Définition |
|-------|-----------|
| **Vendeur** | Producteur agricole, artisan ou petit transformateur qui propose des produits locaux à la vente sur la plateforme |
| **Acheteur** | Consommateur (généralement urbain) qui achète des produits locaux via la plateforme |
| **Rameneur** | Particulier qui utilise l'espace libre de son véhicule lors d'un trajet existant pour transporter des produits du vendeur vers l'acheteur |
| **Matching** | Processus automatique d'association d'un rameneur compatible à une commande, basé sur la géographie et la disponibilité |
| **Commande** | Transaction complète incluant les produits, le paiement et le transport, impliquant les 3 parties |
| **Mission** | Du point de vue du rameneur : une proposition de transport à accepter ou refuser |
| **Zone géographique** | Périmètre d'action défini par un centre (ville/code postal) et un rayon en km, sans adresse exacte |
| **Commission plateforme** | Part du montant de la commande retenue par Delta (5%) |
| **Panier moyen** | Montant moyen d'une commande sur la plateforme |
| **Territoire** | National — tous les axes ruraux-urbains |
| **MVP** | Minimum Viable Product — première version lançable de la plateforme |

### 1.4 Conventions

- **Must** : Indispensable au MVP, bloquant si absent
- **Should** : Important, à inclure si possible dans le MVP
- **Could** : Souhaitable, reportable sans risque
- **Won't (MVP)** : Explicitement exclu du MVP, envisagé ultérieurement
- Les user stories suivent le format : *En tant que [rôle], je veux [action] afin de [bénéfice]*
- Les critères d'acceptation sont notés **CA-XX** sous les stories critiques

---

## 2. Vision, Mission et Principes Produit

### 2.1 Vision

Un monde où acheter des produits locaux de qualité est aussi simple que commander en ligne, où les producteurs sont justement rémunérés, et où le transport est assuré par des trajets déjà existants plutôt que par de nouveaux camions sur les routes.

### 2.2 Mission

Connecter vendeurs de produits locaux, acheteurs urbains et particuliers en déplacement (rameneurs) sur tous les axes ruraux-urbains de France.

### 2.3 Principes Produit

Ces principes guident **tous les arbitrages** quand deux options s'opposent :

| # | Principe | Plutôt que |
|---|----------|-----------|
| P1 | **Confiance d'abord** — Chaque fonctionnalité doit renforcer la confiance entre inconnus | Vitesse de développement ou richesse fonctionnelle |
| P2 | **Simplicité pour le rameneur** — Le rameneur doit pouvoir accepter/refuser en moins de 30 secondes | Flexibilité maximale ou options avancées |
| P3 | **Juste rémunération du vendeur** — Le vendeur fixe ses prix librement et reçoit 85% minimum | Optimisation des marges plateforme |
| P4 | **Sécurité alimentaire non négociable** — Aucun produit sensible sans protocole validé | Largeur du catalogue |
| P5 | **Expérience mobile native** — L'application mobile est le canal principal | Parité web/mobile |
| P6 | **Matching fiable plutôt que rapide** — Mieux vaut un matching réussi en 48h qu'un échec en 2h | Promesse de délai agressif |
| P7 | **Données minimales** — Ne collecter que les données strictement nécessaires au service | Personnalisation poussée ou analytics avancées |
| P8 | **Transparence totale** — L'utilisateur voit toujours pourquoi une décision a été prise (prix, matching, refus) | Algorithmes opaques ou UX simplifiée à l'excès |

---

## 3. Contexte marché et opportunité

### 3.1 Marché alimentaire français

- Marché total : **211 Md€** (2024), dont grande distribution **135 Md€** (61%)
- E-commerce alimentaire : **22 Md€** (10% du marché)
- Produits locaux et régionaux : ~**40 Md€**
- Inflation alimentaire +21% depuis 2021, volumes -1,5%

### 3.2 Circuits courts

- **90 000 exploitants** vendent en circuit court en France (23% des exploitations)
- Vente directe ferme : 64%, marchés : 33%, internet : marginal mais en croissance
- **80%** des consommateurs déclarent acheter local ; **67%** au moins 1 fois/mois (+6 pts vs 2023)
- Freins principaux : prix (78%), accessibilité (40%)

### 3.3 Positionnement concurrentiel

| Acteur | Modèle | Différence avec Delta |
|--------|--------|----------------------|
| La Ruche qui dit Oui | Points de retrait collectifs, 21% commission | Delta : livraison porte-à-porte via rameneurs, 5% commission |
| AMAP | Abonnement fixe, 100% au producteur | Delta : achat flexible, pas d'engagement |
| Shopopop / Yper | Livraison collaborative depuis drives | Delta : depuis producteurs locaux, pas depuis la grande distribution |
| Cocolis | Covoiturage colis longue distance | Delta : spécialisé alimentaire local, axe rural→urbain |

**Positionnement Blue Ocean** : Aucun acteur ne combine la mise en relation producteurs locaux / acheteurs urbains / transporteurs particuliers sur l'axe rural-urbain.

### 3.4 Modèle territorial

Delta opère sur tous les axes ruraux-urbains de France, sans restriction géographique. Le modèle repose sur la densité de trajets existants entre zones de production et bassins de consommation urbains.

**Côté offre (zones rurales/périurbaines)** :
- Producteurs agricoles, artisans, petits transformateurs en circuits courts
- Exploitations bio, labels qualité, diversité des terroirs

**Côté demande (zones urbaines)** :
- Ménages urbains avec accès limité aux producteurs locaux
- Fort intérêt pour traçabilité, qualité et relation directe producteur
- Rameneurs : navetteurs, étudiants, actifs en déplacement régulier

### 3.5 TAM / SAM / SOM

| Niveau | Estimation | Base de calcul |
|--------|-----------|---------------|
| **TAM** | ~15 M consommateurs | Français consommant local ≥1x/mois en zone urbaine |
| **SAM** | 3-5 M foyers | Prêts à utiliser un service digital de circuit court |
| **SOM** | 50 000-100 000 utilisateurs actifs | Pénétration 1-2% du SAM sur 3 ans |

### 3.6 Impact environnemental

- Transport alimentaire : 20% des émissions GES du système alimentaire français
- 83% des émissions transport alimentaire viennent du routier
- Le covoiturage de produits utilise des trajets existants → zéro émission marginale
- Objectif France 2030 : -28% émissions transport vs 2015

---

# PARTIE B — CONNAISSANCE UTILISATEUR

---

## 4. Personas approfondis

### 4.1 Persona Vendeur Principal — « Marie, maraîchère bio »

| Attribut | Détail |
|----------|--------|
| **Âge** | 45 ans |
| **Situation** | Exploitante maraîchère bio à 15 km de Rouen, EARL familiale |
| **Revenus** | 1 800 €/mois nets, très variable selon saisons |
| **Digital** | Smartphone Android, utilise Facebook et WhatsApp, pas de site web |
| **Canaux actuels** | Marché hebdomadaire (60%), vente à la ferme (30%), AMAP (10%) |
| **Douleurs** | Zone de chalandise limitée à 20 km ; 1 jour/semaine perdu au marché pour un CA incertain ; pas les moyens de livrer elle-même ; dépendante de la météo pour le marché |
| **Objectifs** | Toucher des clients urbains sans logistique ; vendre ses surplus de saison ; fidéliser une clientèle régulière à distance ; être payée rapidement |
| **Comportement clé** | Disponible tôt le matin, prépare les commandes la veille, préfère les interactions simples et rapides |
| **Citation** | *« Je voudrais vendre en ville mais je ne peux pas y aller chaque semaine. »* |

### 4.2 Persona Vendeur Secondaire — « Jean-Pierre, apiculteur artisan »

| Attribut | Détail |
|----------|--------|
| **Âge** | 62 ans |
| **Situation** | Apiculteur en zone rurale, activité complémentaire à la retraite |
| **Digital** | Smartphone basique, usage limité (appels, SMS, WhatsApp) |
| **Canaux actuels** | Vente à la ferme, bouche-à-oreille, marchés ponctuels |
| **Douleurs** | Faible volume mais produit premium ; ne sait pas utiliser les outils numériques complexes ; clientèle vieillissante |
| **Objectifs** | Écouler sa production sans effort logistique ; trouver de nouveaux clients plus jeunes |
| **Comportement clé** | A besoin d'un onboarding très guidé, met en ligne peu de produits (3-5), fréquence de mise à jour faible |
| **Citation** | *« Mon miel est excellent mais je ne touche que les gens du coin. »* |

### 4.3 Persona Acheteur Principal — « Sophie, cadre urbaine »

| Attribut | Détail |
|----------|--------|
| **Âge** | 34 ans |
| **Situation** | Cadre en centre-ville, couple sans enfant, pas de voiture |
| **Revenus** | 3 200 €/mois nets |
| **Digital** | iPhone, très à l'aise (Uber Eats, Vinted, Too Good To Go) |
| **Habitudes alimentaires** | Courses chez Monoprix + marché du dimanche quand elle a le temps |
| **Douleurs** | Veut du local/bio mais les marchés sont rares et tôt ; les paniers AMAP manquent de flexibilité ; pas de voiture pour aller chez les producteurs |
| **Objectifs** | Accéder à des produits fermiers authentiques livrés chez elle ; connaître l'origine et le producteur ; consommer de façon responsable sans contrainte |
| **Comportement clé** | Commande le soir ou le week-end, compare les avis, sensible à l'histoire du producteur, panier moyen 40-60 € |
| **Citation** | *« J'adorerais acheter directement au producteur mais c'est impossible sans voiture. »* |

### 4.4 Persona Acheteur Secondaire — « Fatima, mère de famille en périphérie urbaine »

| Attribut | Détail |
|----------|--------|
| **Âge** | 41 ans |
| **Situation** | Mère de 3 enfants en périphérie d'une grande ville, travaille à mi-temps |
| **Revenus** | Foyer 3 500 €/mois |
| **Digital** | Smartphone Android, utilise les apps de courses en ligne |
| **Douleurs** | Budget serré, veut de la qualité pour ses enfants mais le bio en supermarché est cher ; peu de temps |
| **Objectifs** | Trouver des produits sains à prix producteur ; gagner du temps sur les courses ; commander en gros pour la semaine |
| **Comportement clé** | Sensible aux prix, commande en quantité, cherche des produits basiques (légumes, œufs, miel), fidèle si satisfaite |
| **Citation** | *« Si c'est moins cher qu'en bio au supermarché et livré chez moi, je signe tout de suite. »* |

### 4.5 Persona Rameneur Principal — « Thomas, navetteur régulier »

| Attribut | Détail |
|----------|--------|
| **Âge** | 29 ans |
| **Situation** | Développeur en télétravail partiel, fait un trajet ville-campagne 2-3x/semaine en voiture |
| **Revenus** | 2 800 €/mois nets |
| **Digital** | iPhone, power user (BlaBlaCar, Waze, apps mobilité) |
| **Motivation** | Rentabiliser ses trajets, coffre souvent vide ; sensibilité écologique |
| **Douleurs** | BlaBlaCar pas toujours rentable ; péages + essence coûtent cher ; cherche des revenus complémentaires simples |
| **Objectifs** | Gagner 50-150 €/mois sans effort ; choisir ses missions librement ; itinéraire pas trop modifié |
| **Comportement clé** | Consulte l'app la veille de son trajet, accepte en < 30s si le détour est < 10 min, veut un processus simple (collecter → déposer) |
| **Citation** | *« Mon coffre est vide 3 jours sur 5, autant que ça serve à quelque chose. »* |

### 4.6 Persona Rameneur Secondaire — « Nadia, étudiante en déplacement »

| Attribut | Détail |
|----------|--------|
| **Âge** | 22 ans |
| **Situation** | Étudiante, rentre chez ses parents en zone rurale 2x/mois en voiture partagée ou train |
| **Revenus** | 600 €/mois (bourse + job étudiant) |
| **Digital** | iPhone, très connectée (réseaux sociaux, apps collaboratives) |
| **Motivation** | Chaque euro compte ; aime l'idée d'entraide et d'écologie |
| **Douleurs** | Revenus très limités ; trajets coûteux ; ne veut pas de contrainte horaire rigide |
| **Objectifs** | Financer une partie de ses trajets ; rendre service ; flexibilité totale |
| **Comportement clé** | Accepte les missions qui tombent pile sur son trajet, pas de détour, petits colis uniquement |
| **Citation** | *« Si je peux payer mon péage en ramenant un carton de miel, c'est parfait. »* |

### 4.7 Persona Administrateur — « Lucas, responsable opérations Delta »

| Attribut | Détail |
|----------|--------|
| **Âge** | 31 ans |
| **Situation** | Co-fondateur / premier employé opérations |
| **Objectifs** | Piloter la plateforme au quotidien ; détecter les problèmes avant les utilisateurs ; faire croître le réseau de manière équilibrée |
| **Besoins** | Dashboard temps réel ; outils de modération efficaces ; visibilité sur les litiges ; alertes automatiques sur les anomalies |
| **Douleurs** | Peu de temps, doit gérer vendeurs + acheteurs + rameneurs simultanément ; volume de signalements potentiellement élevé |
| **Citation** | *« Je dois voir en un coup d'œil si le réseau est sain ou si quelque chose dérape. »* |

---

## 5. Jobs-to-be-Done et Parcours utilisateur

### 5.1 JTBD par persona

**Vendeur (Marie)** :
- *Quand* j'ai des produits prêts à vendre, *je veux* les mettre en ligne rapidement, *pour* toucher des clients au-delà de ma zone habituelle
- *Quand* une commande arrive, *je veux* la préparer et la confier à quelqu'un de confiance, *pour* que le client reçoive mes produits en bon état
- *Quand* la livraison est faite, *je veux* être payée rapidement, *pour* gérer ma trésorerie sereinement

**Acheteur (Sophie)** :
- *Quand* je veux des produits locaux, *je veux* parcourir un catalogue de producteurs vérifiés, *pour* choisir en confiance sans me déplacer
- *Quand* je commande, *je veux* savoir quand et comment mes produits arrivent, *pour* m'organiser
- *Quand* je reçois ma commande, *je veux* évaluer l'expérience, *pour* aider les autres acheteurs et encourager les bons producteurs

**Rameneur (Thomas)** :
- *Quand* je planifie un trajet, *je veux* voir si des missions sont disponibles sur mon itinéraire, *pour* rentabiliser mon déplacement
- *Quand* je reçois une proposition, *je veux* évaluer en un coup d'œil le détour et la rémunération, *pour* décider immédiatement
- *Quand* j'ai livré, *je veux* être payé automatiquement, *pour* ne pas avoir à réclamer

### 5.2 Parcours Vendeur détaillé

```
1. DÉCOUVERTE
   → Entend parler de Delta (bouche-à-oreille, chambre d'agriculture, réseau social)
   → Télécharge l'app

2. INSCRIPTION
   → Crée un compte (email + mot de passe)
   → Choisit le rôle "Vendeur"
   → Accepte les CGU/CGV
   → Confirme son email

3. CONFIGURATION PROFIL
   → Renseigne nom, description, photo
   → Définit sa zone géographique (ville + rayon)
   → Renseigne son IBAN via le prestataire de paiement

4. MISE EN LIGNE PRODUITS
   → Ajoute un produit (nom, description, photo(s), prix, catégorie)
   → Le produit est visible dans le catalogue

5. RÉCEPTION COMMANDE
   → Reçoit une notification push "Nouvelle commande"
   → Consulte le détail (produits, quantités, montant)
   → Confirme la disponibilité des produits

6. PRÉPARATION
   → Prépare physiquement la commande
   → Marque la commande comme "Prête à collecter"

7. REMISE AU RAMENEUR
   → Le rameneur vient chercher la commande
   → Le rameneur confirme la collecte dans l'app
   → Échange via chat si besoin de coordination

8. PAIEMENT
   → Livraison confirmée par l'acheteur
   → Reçoit 85% du montant automatiquement
   → Visualise la transaction dans son tableau de bord

9. ÉVALUATION
   → Note le rameneur (1-5 étoiles)
   → Consulte l'avis laissé par l'acheteur
```

### 5.3 Parcours Acheteur détaillé

```
1. DÉCOUVERTE
   → Cherche des produits locaux, découvre Delta
   → Télécharge l'app

2. INSCRIPTION
   → Crée un compte, choisit "Acheteur"
   → Renseigne nom + adresse de livraison
   → Définit sa zone géographique

3. EXPLORATION CATALOGUE
   → Parcourt les produits disponibles
   → Filtre par catégorie, région, prix
   → Consulte les fiches produits et profils vendeurs
   → Lit les avis des autres acheteurs

4. COMMANDE
   → Ajoute des produits au panier (même vendeur)
   → Visualise le récapitulatif (produits + répartition financière)
   → Vérifie les limites (15 kg / 150 €)

5. PAIEMENT
   → Paie par carte bancaire (100% du montant immédiat)
   → Reçoit une confirmation par email

6. ATTENTE MATCHING
   → Reçoit une notification quand un rameneur est trouvé
   → Peut suivre l'état de sa commande

7. SUIVI LIVRAISON
   → Notifié quand le rameneur collecte
   → Notifié quand le rameneur est en route
   → Coordonne via chat si besoin (horaire, interphone…)

8. RÉCEPTION
   → Reçoit ses produits
   → Confirme la réception dans l'app

9. ÉVALUATION
   → Note le vendeur (1-5 étoiles + commentaire)
   → Note le rameneur (1-5 étoiles + commentaire)
```

### 5.4 Parcours Rameneur détaillé

```
1. DÉCOUVERTE
   → Apprend l'existence de Delta (pub ciblée navetteurs, bouche-à-oreille)
   → Télécharge l'app

2. INSCRIPTION
   → Crée un compte, choisit "Rameneur"
   → Profil simple (pas de documents requis au MVP)

3. CONFIGURATION
   → Définit sa zone géographique (centre + rayon 5-20 km)
   → Indique ses disponibilités (jours / créneaux horaires)
   → Renseigne son IBAN via le prestataire de paiement

4. RÉCEPTION PROPOSITION
   → Reçoit une notification push "Nouvelle mission disponible"
   → Voit : point A (zone vendeur) → point B (zone acheteur), produits, rémunération
   → Dispose de 24h pour répondre

5. ACCEPTATION / REFUS
   → Accepte : mission confirmée, coordonnées du vendeur partagées
   → Refuse : proposition transmise au rameneur suivant

6. COLLECTE
   → Se rend chez le vendeur aux horaires convenus (chat)
   → Récupère le colis
   → Confirme la collecte dans l'app

7. TRANSPORT
   → Transporte les produits lors de son trajet habituel
   → L'app passe en état "En transit"

8. LIVRAISON
   → Dépose le colis chez l'acheteur
   → Confirme la livraison dans l'app

9. PAIEMENT
   → L'acheteur confirme réception
   → Reçoit 10% du montant automatiquement (minimum 5 €)
   → Visualise ses gains dans son tableau de bord

10. ÉVALUATION
    → Reçoit les notes du vendeur et de l'acheteur
```

### 5.5 Cas multi-rôle

Un utilisateur peut cumuler plusieurs rôles (ex : vendeur qui est aussi rameneur sur un autre trajet). Règles :
- Un seul compte avec un rôle principal choisi à l'inscription
- Possibilité d'activer un rôle supplémentaire depuis les paramètres du profil
- L'interface s'adapte au rôle actif (switch de rôle accessible en permanence)
- Un utilisateur ne peut pas être rameneur de sa propre commande en tant que vendeur
- Les notations sont distinctes par rôle (note vendeur ≠ note rameneur)

---

# PARTIE C — STRATÉGIE DE LANCEMENT

---

## 6. Stratégie de démarrage et problème poule-œuf

### 6.1 Le défi des marketplaces à 3 côtés

Delta est une marketplace tri-face : sans vendeurs, pas de produits ; sans acheteurs, pas de commandes ; sans rameneurs, pas de livraison. Lancer les 3 côtés simultanément est irréaliste. La stratégie repose sur un **recrutement séquencé**.

### 6.2 Séquence de recrutement

**Phase 1 — Constituer l'offre (Semaines 1-4) : VENDEURS**

| Action | Objectif | Levier |
|--------|----------|--------|
| Partenariat Chambres d'Agriculture locales | 5-8 vendeurs pilotes | Contact institutionnel, crédibilité |
| Démarchage direct marchés locaux | 5-7 vendeurs complémentaires | Rencontre terrain, démo app |
| Ciblage producteurs déjà en circuit court | Profils habitués à la vente directe | Base Agreste / réseaux AMAP |

**Objectif Phase 1** : 10-15 vendeurs actifs, ≥50 produits en catalogue

**Phase 2 — Activer le transport (Semaines 3-6) : RAMENEURS**

| Action | Objectif | Levier |
|--------|----------|--------|
| Campagne ciblée aires de covoiturage et gares | 10-15 rameneurs | Flyers + QR code |
| Publicité réseaux sociaux (navetteurs, étudiants) | 10-15 rameneurs | Ciblage zones rurales-urbaines |
| Partenariat BlaBlaCar / groupes Facebook covoiturage | Visibilité | Communautés existantes |
| Bonus de lancement : +5 € par mission les 30 premiers jours | Incitation économique | Budget d'amorce |

**Objectif Phase 2** : 20-30 rameneurs inscrits, ≥10 avec disponibilités confirmées

**Phase 3 — Générer la demande (Semaines 5-8) : ACHETEURS**

| Action | Objectif | Levier |
|--------|----------|--------|
| Lancement invitation-only (liste d'attente) | 50-100 premiers acheteurs | Effet de rareté |
| Partenariats influenceurs food/local | Notoriété | Contenu authentique |
| Première commande offerte (frais de livraison) | Conversion | Réduction du risque perçu |

**Objectif Phase 3** : 50-100 acheteurs inscrits, 50+ premières commandes le mois 1

### 6.3 Mécanismes d'amorce

| Mécanisme | Description | Condition d'arrêt |
|-----------|-------------|-------------------|
| **Bonus rameneur lancement** | +5 € par mission pendant 30 jours | Atteint 30 missions/semaine |
| **Livraison offerte 1ère commande** | Plateforme absorbe la part rameneur | 100 premières commandes |
| **Vendeurs ambassadeurs** | 3 vendeurs pilotes bénéficient de 0% commission pendant 3 mois | Fin du trimestre de lancement |
| **Matching manuel de secours** | L'admin peut attribuer manuellement un rameneur si l'algorithme échoue | Taux de matching auto > 70% |

### 6.4 Plan de contingence

| Risque | Indicateur d'alerte | Action corrective |
|--------|---------------------|-------------------|
| Pas assez de rameneurs | Taux de matching < 50% après 2 semaines | Augmenter le bonus à +10 € ; élargir le rayon ; campagne recrutement d'urgence |
| Pas assez de commandes | < 10 commandes/semaine après lancement | Offre promotionnelle acheteurs ; relance vendeurs pour enrichir catalogue |
| Rameneurs inscrits mais inactifs | > 60% des rameneurs n'ont accepté aucune mission | Notification push personnalisée ; appel direct des 10 premiers rameneurs |
| Vendeurs déçus (peu de ventes) | < 2 commandes/vendeur/mois | Communication transparente ; mise en avant des vendeurs sous-exposés |

---

## 7. Réponses aux questions en suspens

Le cahier des charges identifiait 7 questions non tranchées. Voici les décisions prises avec argumentation.

### Q1 : Doit-on intégrer les produits transformés au MVP ?

**Décision : OUI, uniquement les produits transformés secs (conserves, confitures, biscuits, pâtes artisanales)**

*Argumentation* : Exclure tous les produits transformés priverait la plateforme de références emblématiques normandes (confitures, biscuits, cidre — ce dernier exclu car alcool). Les produits transformés secs ne posent aucun problème de conservation ni de chaîne du froid. Cela enrichit le catalogue dès le lancement sans risque sanitaire.

*Catégories MVP autorisées* :
1. Produits secs (légumineuses, céréales, farines…)
2. Produits agricoles non sensibles (miel, œufs, fruits/légumes robustes…)
3. Produits transformés secs (confitures, conserves, biscuits, pâtes, sauces en bocal…)

*Exclus du MVP* : produits frais (chaîne du froid), alcool (licence), produits très périssables.

### Q2 : Souhaitons-nous prévoir une limite par commande ?

**Décision : OUI — 15 kg ET 150 €**

*Argumentation* : Le transport est assuré par des particuliers dans leur véhicule personnel. Une limite de poids (15 kg) garantit que le colis reste manipulable par une seule personne. Une limite de montant (150 €) réduit le risque financier en cas de litige pour les premières commandes. Ces limites sont affichées clairement et pourront être ajustées après retour d'expérience.

*Règles* :
- Le panier est bloqué au-delà de 15 kg ou 150 €
- L'utilisateur voit un message explicatif avec les limites
- Un vendeur ne peut pas mettre en vente un produit unitaire > 15 kg

### Q3 : Rayon fixe ou dynamique pour le matching ?

**Décision : RAYON FIXE — 15 km côté vendeur, 10 km côté acheteur**

*Argumentation* : Un rayon dynamique basé sur la densité complexifie l'algorithme et rend le système opaque pour l'utilisateur (« pourquoi mon voisin est livré et pas moi ? »). Un rayon fixe est simple à comprendre, à communiquer et à debugger. Le rameneur définit son propre rayon (5-20 km) qui doit chevaucher les deux zones.

*Règles* :
- Zone vendeur : centre = localisation déclarée, rayon = 15 km
- Zone acheteur : centre = adresse de livraison, rayon = 10 km
- Zone rameneur : centre = sa localisation, rayon = configurable 5-20 km
- Pour un matching valide : le rameneur doit être dans le rayon de la zone vendeur ET de la zone acheteur
- Post-MVP : envisager un rayon dynamique si les données montrent un besoin

### Q4 : Rémunération minimum pour le rameneur ?

**Décision : OUI — Plancher fixe à 5 €**

*Argumentation* : Sur une commande de 20 €, le rameneur ne toucherait que 2 € (10%). C'est insuffisant pour motiver un détour, même minime. Un plancher à 5 € garantit que chaque mission est économiquement intéressante. Le surplus (5 € - montant théorique de 10%) est absorbé par la plateforme (commission réduite).

*Règles* :
- Si 10% du montant ≥ 5 € : le rameneur touche 10% (règle standard)
- Si 10% du montant < 5 € : le rameneur touche 5 €, la commission plateforme est réduite en conséquence
- Si le montant de la commande est si faible que 5 € rameneur + 85% vendeur > 100% : la commission plateforme passe à 0% et le vendeur absorbe l'écart (cas rare : commandes < 33 €). En pratique, sur une commande de 30 € : vendeur 25,50 € (85%), rameneur 5 € (16,7%), plateforme -0,50 € (négatif) → la plateforme ne prélève rien, le rameneur touche 5 €, le vendeur touche 25 €
- Seuil de rentabilité plateforme : commandes ≥ 50 € (rameneur = 5 €, plateforme = 2,50 €, vendeur = 42,50 €)

### Q5 : Commission variable selon le type de produit ?

**Décision : NON — Commission fixe à 5% pour tous les produits**

*Argumentation* : Une commission variable complexifie la compréhension pour le vendeur (« combien vais-je toucher ? ») et crée des distorsions (certains produits deviennent moins intéressants à vendre). La simplicité du modèle 85/10/5 est un argument commercial fort face à La Ruche (21% de commission). Maintenir un taux unique renforce le principe P3 (juste rémunération) et P8 (transparence).

### Q6 : Mécanisme de remboursement / litiges ?

**Décision : OUI — Système à 3 niveaux**

*Détail complet en section 12 (Cadre de confiance et sécurité). Résumé :*

| Niveau | Déclencheur | Résolution |
|--------|------------|------------|
| **Niveau 1 — Résolution directe** | Problème mineur (retard, produit légèrement différent) | Chat entre les parties, pas d'intervention plateforme |
| **Niveau 2 — Médiation plateforme** | Signalement par une partie (produit endommagé, non-conformité) | Admin examine les preuves (photos, chat), propose remboursement partiel ou total |
| **Niveau 3 — Décision unilatérale** | Fraude avérée, non-livraison, produit dangereux | Admin tranche : remboursement total acheteur + potentielle suspension du fautif |

### Q7 : Quels KPIs écologiques sont prioritaires ?

**Décision : KPI principal = kilomètres de transport dédié évités**

*Argumentation* : Le CO₂ économisé est difficile à calculer précisément (dépend du véhicule, du chargement, de l'alternative de référence). En revanche, les « kilomètres de transport dédié évités » sont simples à mesurer : distance vendeur → acheteur qui n'a pas nécessité de véhicule supplémentaire sur la route.

*Formule* : Pour chaque commande livrée, km évités = distance à vol d'oiseau entre zone vendeur et zone acheteur (approximation conservative).

*KPIs écologiques MVP* :
1. **Km évités cumulés** (affiché sur le dashboard admin et dans le profil utilisateur)
2. **Nombre de trajets mutualisés** (commandes livrées via des trajets existants)
3. Post-MVP : estimation CO₂ économisé (en appliquant un facteur d'émission moyen par km)

---

# PARTIE D — DÉFINITION FONCTIONNELLE DÉTAILLÉE

---

## 8. Modèle économique produit

### 8.1 Répartition financière

| Bénéficiaire | Part | Conditions de versement |
|-------------|------|------------------------|
| **Vendeur** | 85% du montant produits | Versé après confirmation de réception par l'acheteur |
| **Rameneur** | 10% du montant produits (min. 5 €) | Versé après confirmation de réception par l'acheteur |
| **Plateforme** | 5% du montant produits | Retenu automatiquement |

### 8.2 Flux financier d'une commande

```
1. ACHETEUR paie 100% du montant à la commande
   → Fonds séquestrés par le prestataire de paiement

2. LIVRAISON confirmée par l'acheteur (ou auto-confirmée après 48h)
   → Déclenchement automatique de la distribution :
     - 85% → compte vendeur
     - 10% (min. 5 €) → compte rameneur
     - 5% (ajusté si plancher rameneur activé) → compte plateforme

3. CAS SPÉCIAUX :
   - Annulation avant matching : remboursement 100% acheteur
   - Annulation après matching, avant collecte : remboursement 100% acheteur
   - Litige après livraison : selon décision admin (cf. section 12)
```

### 8.3 Catégories de produits autorisés (MVP)

| Catégorie | Exemples | Conditions |
|-----------|----------|-----------|
| **Produits secs** | Légumineuses, céréales, farines, graines | Emballage hermétique |
| **Produits agricoles non sensibles** | Miel, œufs, fruits robustes, légumes racines, pommes de terre, oignons | Pas de chaîne du froid nécessaire |
| **Produits transformés secs** | Confitures, conserves, biscuits artisanaux, pâtes, sauces en bocal | Emballage intact, DLC > 30 jours |

**Produits interdits (MVP)** : Produits frais nécessitant le froid, viande, poisson, produits laitiers non pasteurisés, alcool, produits sans étiquetage.

---

## 9. Machine à états de la commande

### 9.1 Les 17 états

| # | État | Description | Acteur déclencheur |
|---|------|-------------|-------------------|
| 1 | `BROUILLON` | Panier en cours de constitution | Acheteur |
| 2 | `VALIDEE` | Panier validé, en attente de paiement | Acheteur |
| 3 | `PAIEMENT_EN_COURS` | Paiement en traitement | Système |
| 4 | `PAYEE` | Paiement confirmé, fonds séquestrés | Système |
| 5 | `EN_ATTENTE_VENDEUR` | Vendeur doit confirmer la disponibilité | Système |
| 6 | `CONFIRMEE_VENDEUR` | Vendeur confirme les produits disponibles | Vendeur |
| 7 | `EN_ATTENTE_MATCHING` | Recherche de rameneur lancée | Système |
| 8 | `RAMENEUR_PROPOSE` | Proposition envoyée à un rameneur | Système |
| 9 | `RAMENEUR_ACCEPTE` | Rameneur a accepté la mission | Rameneur |
| 10 | `PRETE_COLLECTE` | Vendeur a préparé le colis | Vendeur |
| 11 | `COLLECTEE` | Rameneur a récupéré le colis chez le vendeur | Rameneur |
| 12 | `EN_TRANSIT` | Rameneur en route vers l'acheteur | Système |
| 13 | `LIVREE` | Rameneur confirme avoir déposé le colis | Rameneur |
| 14 | `RECEPTION_CONFIRMEE` | Acheteur confirme la bonne réception | Acheteur |
| 15 | `TERMINEE` | Paiements distribués, commande clôturée | Système |
| 16 | `ANNULEE` | Commande annulée (multiple raisons possibles) | Variable |
| 17 | `EN_LITIGE` | Un litige est ouvert sur cette commande | Variable |

### 9.2 Transitions et timeouts

```
BROUILLON ──[Acheteur valide le panier]──→ VALIDEE
VALIDEE ──[Redirection paiement]──→ PAIEMENT_EN_COURS
PAIEMENT_EN_COURS ──[Paiement confirmé]──→ PAYEE
PAIEMENT_EN_COURS ──[Échec/Timeout 30 min]──→ ANNULEE (motif: paiement_echoue)
PAYEE ──[Auto: notification vendeur]──→ EN_ATTENTE_VENDEUR
EN_ATTENTE_VENDEUR ──[Vendeur confirme]──→ CONFIRMEE_VENDEUR
EN_ATTENTE_VENDEUR ──[Timeout 48h]──→ ANNULEE (motif: vendeur_timeout) + remboursement 100%
EN_ATTENTE_VENDEUR ──[Vendeur refuse]──→ ANNULEE (motif: vendeur_refuse) + remboursement 100%
CONFIRMEE_VENDEUR ──[Auto: lancement matching]──→ EN_ATTENTE_MATCHING
EN_ATTENTE_MATCHING ──[Rameneur identifié]──→ RAMENEUR_PROPOSE
EN_ATTENTE_MATCHING ──[Aucun rameneur après 3 tentatives]──→ ANNULEE (motif: matching_echoue) + remboursement 100%
RAMENEUR_PROPOSE ──[Rameneur accepte]──→ RAMENEUR_ACCEPTE
RAMENEUR_PROPOSE ──[Rameneur refuse / Timeout 24h]──→ EN_ATTENTE_MATCHING (compteur tentatives +1)
RAMENEUR_ACCEPTE ──[Vendeur prépare]──→ PRETE_COLLECTE
RAMENEUR_ACCEPTE ──[Timeout 72h sans préparation]──→ Notification admin (escalade)
PRETE_COLLECTE ──[Rameneur collecte]──→ COLLECTEE
PRETE_COLLECTE ──[Timeout 48h sans collecte]──→ Notification admin (escalade)
COLLECTEE ──[Auto]──→ EN_TRANSIT
EN_TRANSIT ──[Rameneur confirme livraison]──→ LIVREE
EN_TRANSIT ──[Timeout 72h]──→ Notification admin (escalade)
LIVREE ──[Acheteur confirme]──→ RECEPTION_CONFIRMEE
LIVREE ──[Timeout 48h sans réponse acheteur]──→ RECEPTION_CONFIRMEE (auto-confirmation)
RECEPTION_CONFIRMEE ──[Auto: distribution paiements]──→ TERMINEE

-- Transitions transversales --
{PAYEE → LIVREE} ──[Signalement par une partie]──→ EN_LITIGE
{PAYEE → EN_ATTENTE_VENDEUR} ──[Acheteur annule]──→ ANNULEE (motif: acheteur_annule) + remboursement 100%
{CONFIRMEE_VENDEUR → RAMENEUR_ACCEPTE} ──[Acheteur annule]──→ ANNULEE (motif: acheteur_annule_tardif) + remboursement 100%
{PRETE_COLLECTE → EN_TRANSIT} ──[Acheteur annule]──→ EN_LITIGE (annulation tardive)
EN_LITIGE ──[Admin résout]──→ TERMINEE ou ANNULEE
```

### 9.3 Notifications par état

| Transition vers | Vendeur | Acheteur | Rameneur | Admin |
|----------------|---------|----------|----------|-------|
| `PAYEE` | "Nouvelle commande reçue" | "Paiement confirmé" | — | — |
| `EN_ATTENTE_VENDEUR` | "Confirmez la disponibilité" | — | — | — |
| `CONFIRMEE_VENDEUR` | — | "Vendeur a confirmé, recherche de rameneur" | — | — |
| `RAMENEUR_PROPOSE` | — | — | "Nouvelle mission disponible" | — |
| `RAMENEUR_ACCEPTE` | "Rameneur trouvé : [prénom]" | "Rameneur trouvé : [prénom]" | "Mission confirmée" | — |
| `PRETE_COLLECTE` | — | "Commande en préparation" | "Commande prête, allez collecter" | — |
| `COLLECTEE` | "Rameneur a récupéré vos produits" | "Produits en route" | — | — |
| `LIVREE` | "Livraison effectuée" | "Confirmez la réception" | "Livraison confirmée" | — |
| `TERMINEE` | "Paiement reçu : XX €" | "Merci ! Notez votre expérience" | "Paiement reçu : XX €" | — |
| `ANNULEE` | Selon motif | "Commande annulée + remboursement" | Selon contexte | Si motif anormal |
| `EN_LITIGE` | "Litige ouvert" | "Litige ouvert" | "Litige ouvert" | "Nouveau litige à traiter" |
| Timeout (escalade) | — | — | — | "Alerte : commande bloquée [ID]" |

---

## 10. Algorithme de matching

### 10.1 Déclenchement

Le matching se déclenche automatiquement quand une commande passe à l'état `EN_ATTENTE_MATCHING` (après confirmation vendeur).

### 10.2 Filtrage (critères éliminatoires)

Un rameneur est **éligible** si et seulement si toutes les conditions suivantes sont remplies :

1. **Géographie** : le rayon du rameneur chevauche la zone vendeur (15 km) ET la zone acheteur (10 km)
2. **Disponibilité** : le rameneur a au moins 1 créneau disponible dans les 7 prochains jours
3. **Statut actif** : le rameneur n'est pas désactivé/suspendu
4. **Capacité** : le rameneur n'a pas déjà 2 missions en cours (limite MVP)
5. **Non-conflit** : le rameneur n'est pas le vendeur ou l'acheteur de cette commande

### 10.3 Classement (critères de tri)

Les rameneurs éligibles sont classés par score décroissant :

| Critère | Poids | Calcul |
|---------|-------|--------|
| **Note moyenne** | 40% | Note ≥ 3.5/5 = bonus ; < 3.5 = malus ; nouveau rameneur = neutre |
| **Proximité géographique** | 30% | Distance combinée (rameneur→vendeur + rameneur→acheteur), normalisée |
| **Fiabilité** | 20% | Taux d'acceptation sur les 10 dernières propositions |
| **Ancienneté** | 10% | Nombre de missions complétées avec succès |

*Note : un nouveau rameneur (< 3 missions) reçoit un bonus de visibilité temporaire (+15% de score) pour lui permettre de recevoir ses premières propositions.*

### 10.4 Mécanisme de proposition séquentiel

```
1. Calcul de la liste ordonnée des rameneurs éligibles
2. Proposition envoyée au rameneur #1 (notification push)
3. Le rameneur a 24h pour accepter ou refuser
   → Accepte : transition vers RAMENEUR_ACCEPTE ✓
   → Refuse ou timeout : proposition au rameneur #2
4. Après le rameneur #3 :
   → Si refus/timeout : commande → ANNULEE (motif: matching_echoue)
   → Remboursement 100% de l'acheteur
   → Notification à l'admin pour analyse
```

### 10.5 Cas limites et fallbacks

| Cas | Comportement |
|-----|-------------|
| **0 rameneur éligible** | La commande reste en `EN_ATTENTE_MATCHING` pendant 72h max, puis ANNULEE + remboursement. Notification admin immédiate. |
| **1 seul rameneur éligible** | Proposition unique. Si refus/timeout après 24h → ANNULEE + remboursement. |
| **Rameneur accepte puis se désiste** | Commande revient à `EN_ATTENTE_MATCHING`. Le compteur de tentatives continue. Le rameneur reçoit un avertissement (impact sur sa note de fiabilité). |
| **Tous les rameneurs ont refusé** | ANNULEE + remboursement 100%. L'admin est alerté pour action manuelle éventuelle (matching de secours pendant la phase d'amorce). |
| **Commande multi-vendeurs** | Hors MVP. Le panier est limité à un seul vendeur par commande. |
| **Vendeur et acheteur très éloignés** | Si aucun rameneur ne couvre les deux zones, le matching échoue directement. L'acheteur est informé que cette zone n'est pas encore desservie. |

---

## 11. User Stories complètes

### Vue d'ensemble

| Epic | Nombre d'US | Statut |
|------|-------------|--------|
| EP01 - Authentification & Comptes | 13 | 12 existantes + 1 nouvelle |
| EP02 - Profil Vendeur | 6 | Existantes |
| EP03 - Catalogue Produits | 10 | Existantes |
| EP04 - Profil Acheteur | 5 | Existantes |
| EP05 - Panier & Commande | 9 | 8 existantes + 1 nouvelle |
| EP06 - Paiement | 8 | 7 existantes + 1 nouvelle |
| EP07 - Profil Rameneur | 8 | Existantes |
| EP08 - Matching Automatique | 10 | 9 existantes + 1 nouvelle |
| EP09 - Communication | 6 | Existantes |
| EP10 - Notation & Avis | 8 | Existantes |
| EP11 - Notifications | 6 | Existantes |
| EP12 - Back-office Administration | 16 | 14 existantes + 2 nouvelles |
| **EP13 - Onboarding** | **7** | **Toutes nouvelles** |
| **EP14 - Cas exceptionnels** | **12** | **Toutes nouvelles** |
| **TOTAL** | **124** | **99 existantes + 25 nouvelles** |

---

### EP01 — Authentification & Gestion des Comptes

| ID | User Story | Priorité |
|----|-----------|----------|
| US-01.01 | **En tant que** visiteur, **je veux** créer un compte avec mon email et mot de passe **afin de** accéder aux fonctionnalités de la plateforme | Must |
| US-01.02 | **En tant que** visiteur, **je veux** choisir mon type de profil (vendeur/acheteur/rameneur) lors de l'inscription **afin de** accéder aux fonctionnalités adaptées à mon rôle | Must |
| US-01.03 | **En tant que** utilisateur inscrit, **je veux** recevoir un email de confirmation **afin de** valider mon adresse email | Must |
| US-01.04 | **En tant que** utilisateur inscrit, **je veux** me connecter avec mes identifiants **afin de** accéder à mon espace personnel | Must |
| US-01.05 | **En tant que** utilisateur connecté, **je veux** me déconnecter **afin de** sécuriser mon compte | Must |
| US-01.06 | **En tant que** utilisateur, **je veux** réinitialiser mon mot de passe via email **afin de** récupérer l'accès à mon compte si je l'ai oublié | Must |
| US-01.07 | **En tant que** utilisateur, **je veux** modifier mon mot de passe **afin de** sécuriser mon compte | Should |
| US-01.08 | **En tant que** utilisateur, **je veux** supprimer mon compte **afin de** exercer mon droit à l'oubli (RGPD) | Must |
| US-01.09 | **En tant que** utilisateur, **je veux** consulter et accepter les CGU/CGV lors de l'inscription **afin de** comprendre mes droits et obligations | Must |
| US-01.10 | **En tant que** utilisateur, **je veux** donner mon consentement explicite pour le traitement de mes données **afin de** respecter la conformité RGPD | Must |
| US-01.11 | **En tant que** utilisateur, **je veux** rester connecté sur mon appareil mobile **afin de** ne pas avoir à me reconnecter à chaque utilisation | Should |
| US-01.12 | **En tant que** utilisateur, **je veux** être informé si mon email est déjà utilisé **afin de** comprendre pourquoi mon inscription échoue | Must |
| **US-01.13** | **En tant que** utilisateur, **je veux** activer un rôle supplémentaire depuis mes paramètres **afin de** pouvoir être à la fois vendeur et rameneur (ou autre combinaison) | **Should** *(NOUVELLE)* |

> **Critères d'acceptation — US-01.01 (story critique)** :
> - CA-01 : Le formulaire exige email valide + mot de passe ≥ 8 caractères avec 1 majuscule et 1 chiffre
> - CA-02 : Un email de confirmation est envoyé dans les 60 secondes
> - CA-03 : Le compte n'est pas activé tant que l'email n'est pas confirmé
> - CA-04 : Les données sont stockées conformément au RGPD (mot de passe hashé)

---

### EP02 — Profil Vendeur

| ID | User Story | Priorité |
|----|-----------|----------|
| US-02.01 | **En tant que** vendeur, **je veux** renseigner mes informations de profil (nom, description, photo) **afin de** me présenter aux acheteurs | Must |
| US-02.02 | **En tant que** vendeur, **je veux** définir ma zone géographique (région) **afin de** indiquer où mes produits peuvent être récupérés | Must |
| US-02.03 | **En tant que** vendeur, **je veux** modifier mes informations de profil **afin de** les maintenir à jour | Must |
| US-02.04 | **En tant que** vendeur, **je veux** visualiser mon profil public **afin de** voir comment il apparaît aux acheteurs | Should |
| US-02.05 | **En tant que** vendeur, **je veux** ajouter une photo de profil **afin de** personnaliser mon espace et inspirer confiance | Should |
| US-02.06 | **En tant que** vendeur, **je veux** accéder à mon tableau de bord **afin de** avoir une vue d'ensemble de mon activité | Must |

---

### EP03 — Catalogue Produits

| ID | User Story | Priorité |
|----|-----------|----------|
| US-03.01 | **En tant que** vendeur, **je veux** ajouter un produit avec nom, description, photo, prix et catégorie **afin de** le proposer à la vente | Must |
| US-03.02 | **En tant que** vendeur, **je veux** télécharger une ou plusieurs photos pour mon produit **afin de** le présenter visuellement aux acheteurs | Must |
| US-03.03 | **En tant que** vendeur, **je veux** catégoriser mon produit (produits secs, agricoles non sensibles, transformés secs) **afin de** faciliter sa découverte | Must |
| US-03.04 | **En tant que** vendeur, **je veux** définir librement le prix de mon produit **afin de** fixer ma propre politique tarifaire | Must |
| US-03.05 | **En tant que** vendeur, **je veux** modifier les informations d'un produit existant **afin de** corriger ou mettre à jour les détails | Must |
| US-03.06 | **En tant que** vendeur, **je veux** supprimer un produit **afin de** retirer un article que je ne vends plus | Must |
| US-03.07 | **En tant que** vendeur, **je veux** activer/désactiver un produit **afin de** gérer sa disponibilité sans le supprimer | Must |
| US-03.08 | **En tant que** vendeur, **je veux** visualiser la liste de tous mes produits **afin de** gérer mon catalogue | Must |
| US-03.09 | **En tant que** vendeur, **je veux** être informé si mon produit ne respecte pas les critères autorisés **afin de** comprendre pourquoi il est refusé | Should |
| US-03.10 | **En tant que** vendeur, **je veux** dupliquer un produit existant **afin de** créer rapidement des variantes similaires | Could |

> **Critères d'acceptation — US-03.01 (story critique)** :
> - CA-01 : Les champs nom, description, prix et catégorie sont obligatoires
> - CA-02 : Au moins 1 photo est requise, maximum 5
> - CA-03 : Le prix doit être > 0 € et ≤ 150 €
> - CA-04 : La catégorie doit être parmi les 3 autorisées (secs, agricoles non sensibles, transformés secs)
> - CA-05 : Le produit est visible dans le catalogue immédiatement après publication

---

### EP04 — Profil Acheteur

| ID | User Story | Priorité |
|----|-----------|----------|
| US-04.01 | **En tant qu'** acheteur, **je veux** renseigner mon nom et mon adresse de livraison **afin de** recevoir mes commandes | Must |
| US-04.02 | **En tant qu'** acheteur, **je veux** modifier mes informations de profil **afin de** les maintenir à jour | Must |
| US-04.03 | **En tant qu'** acheteur, **je veux** définir ma zone géographique de livraison **afin de** être matché avec des rameneurs pertinents | Must |
| US-04.04 | **En tant qu'** acheteur, **je veux** enregistrer plusieurs adresses de livraison **afin de** choisir selon mes besoins | Could |
| US-04.05 | **En tant qu'** acheteur, **je veux** accéder à mon historique de commandes **afin de** retrouver mes achats passés | Must |

---

### EP05 — Panier & Commande

| ID | User Story | Priorité |
|----|-----------|----------|
| US-05.01 | **En tant qu'** acheteur, **je veux** parcourir la liste des produits disponibles **afin de** découvrir l'offre de la plateforme | Must |
| US-05.02 | **En tant qu'** acheteur, **je veux** filtrer les produits par type, région et prix **afin de** trouver rapidement ce que je cherche | Must |
| US-05.03 | **En tant qu'** acheteur, **je veux** consulter la fiche détaillée d'un produit **afin de** obtenir toutes les informations avant d'acheter | Must |
| US-05.04 | **En tant qu'** acheteur, **je veux** ajouter un produit à mon panier **afin de** préparer ma commande | Must |
| US-05.05 | **En tant qu'** acheteur, **je veux** modifier la quantité d'un produit dans mon panier **afin de** ajuster ma commande | Must |
| US-05.06 | **En tant qu'** acheteur, **je veux** supprimer un produit de mon panier **afin de** retirer un article que je ne souhaite plus | Must |
| US-05.07 | **En tant qu'** acheteur, **je veux** visualiser le récapitulatif de ma commande (produits, prix, répartition) **afin de** vérifier avant paiement | Must |
| US-05.08 | **En tant qu'** acheteur, **je veux** voir le profil et la note du vendeur depuis la fiche produit **afin de** évaluer sa fiabilité | Should |
| **US-05.09** | **En tant qu'** acheteur, **je veux** être informé des limites de commande (15 kg / 150 €) **afin de** comprendre les contraintes du panier | **Must** *(NOUVELLE)* |

> **Critères d'acceptation — US-05.04 (story critique)** :
> - CA-01 : Un produit ne peut être ajouté que s'il est actif et disponible
> - CA-02 : Le panier est limité aux produits d'un seul vendeur
> - CA-03 : Le poids total ne peut pas dépasser 15 kg
> - CA-04 : Le montant total ne peut pas dépasser 150 €
> - CA-05 : Si la limite est atteinte, un message explicatif s'affiche

---

### EP06 — Paiement

| ID | User Story | Priorité |
|----|-----------|----------|
| US-06.01 | **En tant qu'** acheteur, **je veux** payer ma commande de manière sécurisée par carte bancaire **afin de** finaliser mon achat | Must |
| US-06.02 | **En tant qu'** acheteur, **je veux** recevoir une confirmation de paiement par email **afin de** avoir une preuve de transaction | Must |
| US-06.03 | **En tant que** vendeur, **je veux** renseigner mes informations bancaires (IBAN) via le prestataire de paiement **afin de** recevoir mes paiements | Must |
| US-06.04 | **En tant que** vendeur, **je veux** recevoir automatiquement 85% du montant après livraison confirmée **afin de** être rémunéré pour mes produits | Must |
| US-06.05 | **En tant que** rameneur, **je veux** recevoir automatiquement 10% du montant (minimum 5 €) après livraison confirmée **afin de** être rémunéré pour le transport | Must |
| US-06.06 | **En tant qu'** acheteur, **je veux** être remboursé automatiquement si aucun rameneur n'est trouvé **afin de** ne pas payer pour une commande non livrée | Must |
| US-06.07 | **En tant qu'** acheteur, **je veux** télécharger ma facture au format PDF **afin de** conserver une preuve d'achat | Should |
| **US-06.08** | **En tant que** rameneur, **je veux** voir clairement ma rémunération (avec le plancher de 5 €) avant d'accepter une mission **afin de** savoir exactement ce que je vais gagner | **Must** *(NOUVELLE)* |

> **Critères d'acceptation — US-06.01 (story critique)** :
> - CA-01 : Le paiement est effectué via un prestataire certifié PCI-DSS
> - CA-02 : 100% du montant est séquestré au moment du paiement
> - CA-03 : En cas d'échec de paiement, l'utilisateur voit un message clair et peut réessayer
> - CA-04 : Un timeout de 30 minutes annule automatiquement la tentative de paiement

---

### EP07 — Profil Rameneur

| ID | User Story | Priorité |
|----|-----------|----------|
| US-07.01 | **En tant que** rameneur, **je veux** créer mon profil simple (sans documents requis) **afin de** commencer à proposer mes services | Must |
| US-07.02 | **En tant que** rameneur, **je veux** définir mon rayon géographique d'action (5-20 km) **afin de** recevoir des propositions pertinentes | Must |
| US-07.03 | **En tant que** rameneur, **je veux** indiquer mes disponibilités (jours/horaires) **afin de** être sollicité aux moments où je suis disponible | Must |
| US-07.04 | **En tant que** rameneur, **je veux** modifier mon rayon géographique et mes disponibilités **afin de** adapter mon profil à mes contraintes | Must |
| US-07.05 | **En tant que** rameneur, **je veux** définir ma rémunération souhaitée (suggestion 10% par défaut) **afin de** fixer mes conditions | Should |
| US-07.06 | **En tant que** rameneur, **je veux** renseigner mes informations bancaires via le prestataire de paiement **afin de** recevoir mes paiements | Must |
| US-07.07 | **En tant que** rameneur, **je veux** accéder à mon tableau de bord avec mes statistiques **afin de** suivre mon activité | Should |
| US-07.08 | **En tant que** rameneur, **je veux** me désactiver temporairement **afin de** ne plus recevoir de propositions pendant une période | Should |

---

### EP08 — Matching Automatique

| ID | User Story | Priorité |
|----|-----------|----------|
| US-08.01 | **En tant que** système, **je veux** rechercher automatiquement un rameneur compatible à chaque nouvelle commande confirmée **afin de** organiser la livraison | Must |
| US-08.02 | **En tant que** système, **je veux** matcher selon le rayon géographique (vendeur 15 km ET acheteur 10 km) **afin de** proposer des trajets réalisables | Must |
| US-08.03 | **En tant que** système, **je veux** vérifier la disponibilité du rameneur sur les 7 prochains jours **afin de** garantir la faisabilité du transport | Must |
| US-08.04 | **En tant que** système, **je veux** prioriser les rameneurs avec une note > 3.5/5 **afin de** garantir la qualité du service | Should |
| US-08.05 | **En tant que** rameneur, **je veux** recevoir une notification de proposition de transport **afin de** décider si je l'accepte | Must |
| US-08.06 | **En tant que** rameneur, **je veux** voir les détails du transport (point A → B, produits, rémunération) avant de décider **afin de** faire un choix éclairé | Must |
| US-08.07 | **En tant que** rameneur, **je veux** accepter ou refuser une proposition de transport **afin de** garder ma liberté de choix | Must |
| US-08.08 | **En tant que** système, **je veux** proposer au rameneur suivant en cas de refus ou timeout (24h) **afin de** maximiser les chances de matching | Must |
| US-08.09 | **En tant que** système, **je veux** annuler et rembourser la commande après 3 tentatives échouées **afin de** ne pas bloquer l'acheteur | Must |
| **US-08.10** | **En tant que** acheteur, **je veux** voir le statut de la recherche de rameneur (tentative 1/3, 2/3…) **afin de** savoir où en est ma commande | **Should** *(NOUVELLE)* |

> **Critères d'acceptation — US-08.01 (story critique)** :
> - CA-01 : Le matching se déclenche automatiquement dès que le vendeur confirme la disponibilité
> - CA-02 : Seuls les rameneurs actifs, disponibles et dans le rayon géographique sont considérés
> - CA-03 : Les rameneurs sont classés par score (note 40%, proximité 30%, fiabilité 20%, ancienneté 10%)
> - CA-04 : La proposition est envoyée au rameneur #1 du classement
> - CA-05 : Maximum 3 tentatives avant annulation automatique

---

### EP09 — Communication (Chat)

| ID | User Story | Priorité |
|----|-----------|----------|
| US-09.01 | **En tant qu'** utilisateur (vendeur/acheteur/rameneur), **je veux** accéder à un chat lié à chaque commande **afin de** communiquer avec les autres parties | Must |
| US-09.02 | **En tant qu'** utilisateur, **je veux** envoyer des messages texte dans le chat **afin de** coordonner la livraison | Must |
| US-09.03 | **En tant qu'** utilisateur, **je veux** consulter l'historique des messages d'une commande **afin de** retrouver les informations échangées | Must |
| US-09.04 | **En tant qu'** utilisateur, **je veux** être notifié des nouveaux messages **afin de** répondre rapidement | Must |
| US-09.05 | **En tant qu'** utilisateur, **je veux** voir les messages non lus clairement identifiés **afin de** ne pas manquer d'informations | Should |
| US-09.06 | **En tant qu'** utilisateur, **je veux** accéder à la liste de toutes mes conversations actives **afin de** gérer mes échanges | Should |

---

### EP10 — Notation & Avis

| ID | User Story | Priorité |
|----|-----------|----------|
| US-10.01 | **En tant qu'** acheteur, **je veux** noter le vendeur (1-5 étoiles) après livraison **afin de** partager mon expérience | Must |
| US-10.02 | **En tant qu'** acheteur, **je veux** noter le rameneur (1-5 étoiles) après livraison **afin de** évaluer la qualité du transport | Must |
| US-10.03 | **En tant que** vendeur, **je veux** noter le rameneur (1-5 étoiles) après livraison **afin de** évaluer la qualité du transport | Must |
| US-10.04 | **En tant qu'** utilisateur, **je veux** ajouter un commentaire optionnel à ma notation **afin de** détailler mon avis | Should |
| US-10.05 | **En tant qu'** utilisateur, **je veux** voir la note moyenne d'un vendeur sur son profil **afin de** évaluer sa fiabilité | Must |
| US-10.06 | **En tant qu'** utilisateur, **je veux** voir la note moyenne d'un rameneur **afin de** évaluer sa fiabilité | Must |
| US-10.07 | **En tant que** vendeur/rameneur, **je veux** voir les avis reçus sur mon profil **afin de** connaître ma réputation | Should |
| US-10.08 | **En tant qu'** utilisateur, **je veux** être invité à noter uniquement après livraison confirmée **afin de** évaluer sur une base réelle | Must |

---

### EP11 — Notifications

| ID | User Story | Priorité |
|----|-----------|----------|
| US-11.01 | **En tant que** vendeur, **je veux** recevoir une notification push pour chaque nouvelle commande **afin de** réagir rapidement | Must |
| US-11.02 | **En tant que** rameneur, **je veux** recevoir une notification push pour chaque proposition de transport **afin de** ne pas manquer d'opportunité | Must |
| US-11.03 | **En tant qu'** acheteur, **je veux** recevoir une notification quand un rameneur est trouvé **afin de** être informé de l'avancement | Must |
| US-11.04 | **En tant qu'** utilisateur, **je veux** recevoir une notification à chaque changement de statut de commande **afin de** suivre la livraison | Must |
| US-11.05 | **En tant qu'** utilisateur, **je veux** recevoir une notification in-app pour les nouveaux messages **afin de** ne pas manquer d'échanges | Must |
| US-11.06 | **En tant qu'** utilisateur, **je veux** gérer mes préférences de notifications **afin de** contrôler les alertes que je reçois | Could |

---

### EP12 — Back-office Administration

| ID | User Story | Priorité |
|----|-----------|----------|
| US-12.01 | **En tant qu'** administrateur, **je veux** accéder à un tableau de bord avec les KPIs clés **afin de** piloter l'activité de la plateforme | Must |
| US-12.02 | **En tant qu'** administrateur, **je veux** visualiser le nombre de trajets effectués **afin de** mesurer l'activité | Must |
| US-12.03 | **En tant qu'** administrateur, **je veux** visualiser le volume de produits vendus (€ et unités) **afin de** mesurer la performance | Must |
| US-12.04 | **En tant qu'** administrateur, **je veux** visualiser les revenus de la plateforme (5%) **afin de** suivre la rentabilité | Must |
| US-12.05 | **En tant qu'** administrateur, **je veux** consulter la liste des utilisateurs par type **afin de** gérer la communauté | Must |
| US-12.06 | **En tant qu'** administrateur, **je veux** suspendre ou réactiver un compte utilisateur **afin de** modérer les comportements inappropriés | Must |
| US-12.07 | **En tant qu'** administrateur, **je veux** consulter la liste des produits **afin de** valider ou modérer le catalogue | Must |
| US-12.08 | **En tant qu'** administrateur, **je veux** désactiver un produit non conforme **afin de** garantir le respect des règles | Must |
| US-12.09 | **En tant qu'** administrateur, **je veux** consulter le détail des commandes et transactions **afin de** investiguer les problèmes | Must |
| US-12.10 | **En tant qu'** administrateur, **je veux** gérer les signalements et litiges **afin de** résoudre les conflits | Must |
| US-12.11 | **En tant qu'** administrateur, **je veux** modérer les avis inappropriés **afin de** garantir un contenu respectueux | Must |
| US-12.12 | **En tant qu'** administrateur, **je veux** exporter les données en CSV **afin de** réaliser des analyses externes | Should |
| US-12.13 | **En tant qu'** administrateur, **je veux** consulter les logs d'audit **afin de** tracer les actions importantes | Should |
| US-12.14 | **En tant qu'** administrateur, **je veux** visualiser le taux de matching réussi **afin de** évaluer l'efficacité de l'algorithme | Must |
| **US-12.15** | **En tant qu'** administrateur, **je veux** visualiser les KPIs écologiques (km évités, trajets mutualisés) **afin de** mesurer l'impact environnemental | **Should** *(NOUVELLE)* |
| **US-12.16** | **En tant qu'** administrateur, **je veux** escalader un litige au niveau supérieur **afin de** gérer les cas complexes selon le cadre à 3 niveaux | **Must** *(NOUVELLE)* |

---

### EP13 — Onboarding *(NOUVEAU)*

| ID | User Story | Priorité |
|----|-----------|----------|
| **US-13.01** | **En tant que** nouvel utilisateur, **je veux** voir un écran de bienvenue adapté à mon rôle (vendeur/acheteur/rameneur) **afin de** comprendre ce que la plateforme m'offre | **Must** |
| **US-13.02** | **En tant que** nouvel utilisateur, **je veux** suivre un tutoriel en 3-4 écrans **afin de** comprendre le fonctionnement de la plateforme | **Must** |
| **US-13.03** | **En tant que** nouveau vendeur, **je veux** être guidé pas à pas pour mettre en ligne mon premier produit **afin de** ne pas abandonner face à la complexité | **Must** |
| **US-13.04** | **En tant que** nouvel acheteur, **je veux** être guidé pour passer ma première commande **afin de** découvrir le parcours complet | **Should** |
| **US-13.05** | **En tant que** nouveau rameneur, **je veux** être guidé pour configurer ma zone et mes disponibilités **afin de** recevoir des propositions rapidement | **Must** |
| **US-13.06** | **En tant que** nouvel utilisateur, **je veux** voir une checklist de démarrage (profil complet, IBAN, premier produit/commande) **afin de** savoir quelles étapes il me reste | **Should** |
| **US-13.07** | **En tant que** utilisateur, **je veux** pouvoir ignorer le tutoriel et y revenir plus tard **afin de** ne pas être bloqué si je suis pressé | **Should** |

> **Critères d'acceptation — US-13.02 (story critique)** :
> - CA-01 : Le tutoriel s'affiche automatiquement à la première connexion après inscription
> - CA-02 : Le contenu est adapté au rôle choisi (vendeur, acheteur, rameneur)
> - CA-03 : L'utilisateur peut naviguer entre les écrans (précédent/suivant) et ignorer
> - CA-04 : Le tutoriel ne se réaffiche pas aux connexions suivantes (sauf demande explicite)

---

### EP14 — Cas exceptionnels *(NOUVEAU)*

| ID | User Story | Priorité |
|----|-----------|----------|
| **US-14.01** | **En tant qu'** acheteur, **je veux** signaler un produit non conforme à la description **afin de** obtenir un recours | **Must** |
| **US-14.02** | **En tant qu'** utilisateur, **je veux** signaler un comportement inapproprié d'un autre utilisateur **afin de** protéger la communauté | **Must** |
| **US-14.03** | **En tant qu'** acheteur, **je veux** annuler ma commande avant la collecte par le rameneur **afin de** changer d'avis sans pénalité | **Must** |
| **US-14.04** | **En tant que** vendeur, **je veux** déclarer une indisponibilité de produit après commande **afin de** signaler honnêtement un problème de stock | **Must** |
| **US-14.05** | **En tant que** système, **je veux** détecter un timeout de livraison (72h après collecte) **afin de** escalader automatiquement à l'admin | **Must** |
| **US-14.06** | **En tant qu'** acheteur, **je veux** signaler un produit endommagé avec photo à l'appui **afin de** déclencher un litige documenté | **Must** |
| **US-14.07** | **En tant que** rameneur, **je veux** signaler que je ne trouve pas le vendeur au point de collecte **afin de** ne pas être pénalisé pour un problème qui ne me concerne pas | **Should** |
| **US-14.08** | **En tant qu'** acheteur, **je veux** modifier mon adresse de livraison tant que le rameneur n'a pas collecté **afin de** corriger une erreur | **Should** |
| **US-14.09** | **En tant qu'** administrateur, **je veux** effectuer un remboursement partiel **afin de** résoudre les litiges de manière proportionnée | **Must** |
| **US-14.10** | **En tant que** système, **je veux** suspendre automatiquement un compte après 3 signalements validés **afin de** protéger la communauté | **Must** |
| **US-14.11** | **En tant que** vendeur/rameneur, **je veux** contester un avis que je juge injuste **afin de** que l'admin puisse le réexaminer | **Should** |
| **US-14.12** | **En tant que** rameneur, **je veux** me désister d'une mission acceptée (avant collecte) **afin de** gérer un imprévu, en comprenant l'impact sur ma fiabilité | **Should** |

> **Critères d'acceptation — US-14.06 (story critique)** :
> - CA-01 : L'acheteur peut joindre 1 à 3 photos du produit endommagé
> - CA-02 : Le signalement est horodaté et rattaché à la commande
> - CA-03 : La commande passe à l'état EN_LITIGE
> - CA-04 : L'admin est notifié immédiatement
> - CA-05 : Le vendeur et le rameneur sont informés du litige ouvert

---

## 12. Cadre de confiance et sécurité

### 12.1 Prévention de la fraude

| Risque | Mesure MVP | Indicateur de détection |
|--------|-----------|------------------------|
| **Faux compte** | Vérification email obligatoire ; 1 compte par email | Multiples comptes depuis même appareil |
| **Faux vendeur** | Validation légère (email + profil complet) ; modération produits | Produits hors catégories autorisées, descriptions suspectes |
| **Faux rameneur** | Pas de documents MVP mais suivi des missions (taux de complétion) | Accepte puis se désiste systématiquement |
| **Achat frauduleux** | Paiement sécurisé via prestataire certifié (3D Secure) | Chargebacks répétés |
| **Collusion vendeur-rameneur** | Détection si même IBAN vendeur/rameneur | Transactions récurrentes entre mêmes acteurs |
| **Produit interdit** | Catégorisation obligatoire + modération admin | Signalements acheteurs |

### 12.2 Vérification des utilisateurs

| Étape | Vendeur | Acheteur | Rameneur |
|-------|---------|----------|----------|
| Email vérifié | Obligatoire | Obligatoire | Obligatoire |
| Profil complet (nom, photo, description) | Obligatoire | Nom + adresse | Obligatoire |
| Zone géographique | Obligatoire | Obligatoire | Obligatoire |
| IBAN via prestataire paiement | Obligatoire (pour recevoir) | Non | Obligatoire (pour recevoir) |
| Documents d'identité | Non (MVP) | Non | Non (MVP) |
| Vérification SIRET | Non (MVP) | — | — |

### 12.3 Gestion des litiges — 3 niveaux

**Niveau 1 — Résolution directe (entre les parties)**

- Déclencheur : problème mineur signalé dans le chat (retard, question sur le produit)
- Processus : les parties échangent dans le chat de la commande
- Pas de changement d'état de commande
- Timeout : si non résolu en 48h, l'utilisateur peut escalader au Niveau 2

**Niveau 2 — Médiation plateforme**

- Déclencheur : un utilisateur clique "Signaler un problème" sur la commande
- Commande passe à l'état `EN_LITIGE`
- L'admin reçoit une notification et examine :
  - L'historique du chat
  - Les photos fournies (produit endommagé, etc.)
  - L'historique des parties (notes, signalements précédents)
- Résolutions possibles :
  - Remboursement partiel (% négocié)
  - Remboursement total acheteur
  - Aucun remboursement (signalement non fondé)
- Délai de résolution cible : 72h

**Niveau 3 — Décision unilatérale**

- Déclencheur : fraude avérée, non-livraison sans justification, produit dangereux, harcèlement
- L'admin prend une décision sans nécessité de consensus :
  - Remboursement total immédiat
  - Suspension temporaire du compte fautif (7 jours)
  - Suspension définitive si récidive (≥ 3 litiges de niveau 3)
- Notification à toutes les parties avec explication

### 12.4 Règles de suspension automatique

| Condition | Action | Réversibilité |
|-----------|--------|--------------|
| 3 signalements validés (tout type) | Suspension 7 jours | Automatique à l'expiration |
| 2 litiges niveau 3 en 3 mois | Suspension 30 jours | Appel auprès de l'admin |
| 3 litiges niveau 3 (historique total) | Suspension définitive | Aucune |
| Note moyenne < 2/5 sur 10 dernières évaluations | Notification d'avertissement | — |
| Note moyenne < 1.5/5 sur 10 dernières évaluations | Suspension 7 jours + revue admin | Admin décide |
| Rameneur : taux d'acceptation < 10% sur 20 dernières propositions | Déprioritisé dans le matching (pas suspendu) | Automatique si le taux remonte |

### 12.5 Protection des données personnelles

| Principe | Mise en œuvre |
|----------|-------------|
| **Minimisation** | Seules les données nécessaires au service sont collectées |
| **Consentement explicite** | Case à cocher distincte des CGU pour le traitement des données |
| **Pas d'adresses exactes visibles** | Les zones géographiques sont affichées (ville + rayon), jamais les adresses précises (sauf au rameneur après acceptation de mission) |
| **Droit à l'effacement** | Suppression de compte = anonymisation des données en 30 jours |
| **Portabilité** | Export des données personnelles au format standard sur demande |
| **Conservation limitée** | Données de commandes conservées 5 ans (obligation légale), données de profil supprimées 30 jours après suppression du compte |

---

# PARTIE E — ARCHITECTURE DE L'INFORMATION

---

## 13. Sitemap et inventaire d'écrans

### 13.1 Arborescence par rôle

**Écrans communs (tous rôles) — 10 écrans**

```
├── Splash / Loading
├── Onboarding (tutoriel 3-4 écrans)
├── Inscription
├── Connexion
├── Mot de passe oublié
├── Paramètres du compte
│   ├── Modifier le profil
│   ├── Changer le mot de passe
│   ├── Gérer les notifications
│   ├── Changer de rôle actif
│   └── Supprimer le compte
└── CGU / CGV / Politique de confidentialité
```

**Écrans Vendeur — 10 écrans**

```
├── Tableau de bord vendeur
├── Mon profil public (prévisualisation)
├── Mon catalogue
│   ├── Liste de mes produits
│   ├── Ajouter/Modifier un produit
│   └── Détail produit (avec activation/désactivation)
├── Mes commandes
│   ├── Liste des commandes (filtrée par statut)
│   └── Détail commande (avec actions : confirmer, prêt à collecter)
├── Chat (par commande)
├── Mes avis reçus
└── Mes informations bancaires
```

**Écrans Acheteur — 12 écrans**

```
├── Accueil / Catalogue produits
│   ├── Filtres (catégorie, région, prix)
│   └── Résultats de recherche
├── Fiche produit détaillée
├── Profil vendeur (public)
├── Panier
├── Récapitulatif commande (avec répartition financière)
├── Paiement
├── Confirmation de commande
├── Mes commandes
│   ├── Liste (filtrée par statut)
│   └── Détail commande (suivi, actions : confirmer réception, signaler)
├── Chat (par commande)
├── Notation post-livraison (vendeur + rameneur)
└── Historique / Factures
```

**Écrans Rameneur — 8 écrans**

```
├── Tableau de bord rameneur
├── Mes disponibilités
├── Ma zone géographique
├── Propositions de missions
│   ├── Liste des propositions en attente
│   └── Détail mission (vendeur zone → acheteur zone, produits, rémunération)
├── Mes missions en cours
│   └── Détail mission (avec actions : collecté, livré)
├── Chat (par mission)
├── Mes statistiques (gains, missions complétées, note)
└── Mes informations bancaires
```

**Écrans Administrateur — 10 écrans**

```
├── Dashboard principal (KPIs)
├── Gestion utilisateurs
│   ├── Liste (filtrable par rôle, statut)
│   └── Détail utilisateur (avec actions : suspendre, réactiver)
├── Gestion produits
│   ├── Liste (filtrable par catégorie, statut)
│   └── Détail produit (avec action : désactiver)
├── Gestion commandes
│   ├── Liste (filtrable par statut)
│   └── Détail commande (historique complet des transitions)
├── Gestion litiges
│   ├── Liste des litiges ouverts
│   └── Détail litige (preuves, chat, actions : rembourser, suspendre)
├── Modération avis
├── Statistiques avancées (KPIs écologiques, taux matching)
└── Logs d'audit
```

**Total : ~40 écrans** (10 communs + 10 vendeur + 12 acheteur + 8 rameneur + 10 admin, avec quelques écrans partagés comme le chat)

### 13.2 Flux de navigation principaux

**Flux 1 — Première commande acheteur** :
Onboarding → Catalogue → Fiche produit → Ajouter au panier → Panier → Récapitulatif → Paiement → Confirmation → (attente) → Suivi commande → Confirmer réception → Notation

**Flux 2 — Première vente vendeur** :
Onboarding → Compléter profil → Ajouter IBAN → Ajouter premier produit → (attente commande) → Notification → Détail commande → Confirmer disponibilité → Marquer prêt → (attente collecte) → Commande terminée

**Flux 3 — Première mission rameneur** :
Onboarding → Configurer zone + disponibilités → Ajouter IBAN → (attente proposition) → Notification → Détail mission → Accepter → Collecter → Livrer → Mission terminée → Paiement reçu

---

# PARTIE F — PÉRIMÈTRE ET LIMITATIONS

---

## 14. Périmètre MVP explicite IN/OUT

### 14.1 IN — Inclus dans le MVP

| Fonctionnalité | Référence |
|---------------|-----------|
| Inscription/connexion email + mot de passe | EP01 |
| 3 rôles distincts (vendeur, acheteur, rameneur) | EP01 |
| Multi-rôle (activation rôle supplémentaire) | US-01.13 |
| Profils complets par rôle | EP02, EP04, EP07 |
| Catalogue produits (3 catégories autorisées) | EP03 |
| Panier mono-vendeur avec limites (15 kg / 150 €) | EP05 |
| Paiement immédiat par carte bancaire | EP06 |
| Séquestre des fonds + distribution automatique (85/10/5) | EP06 |
| Plancher rameneur 5 € | Q4 |
| Matching automatique (rayon fixe, 3 tentatives max) | EP08, Section 10 |
| Chat par commande (texte uniquement) | EP09 |
| Notation réciproque (1-5 étoiles + commentaire) | EP10 |
| Notifications push (commande, matching, chat, statut) | EP11 |
| Onboarding guidé par rôle | EP13 |
| Signalement et litiges 3 niveaux | EP14, Section 12 |
| Back-office complet (utilisateurs, produits, commandes, litiges, stats) | EP12 |
| Machine à états 17 états avec timeouts | Section 9 |
| Application mobile (iOS + Android) | — |
| Territoire : national, tous axes ruraux-urbains | — |
| Conformité RGPD (consentement, suppression, minimisation) | EP01 |

### 14.2 OUT — Exclu du MVP avec justification

| Fonctionnalité exclue | Justification | Horizon envisagé |
|-----------------------|--------------|-----------------|
| **Produits frais / chaîne du froid** | Risque sanitaire, logistique complexe, besoin de protocole validé | Post-MVP Phase 2 |
| **Alcool** | Nécessite licence de vente, vérification majorité | Post-MVP Phase 2 |
| **Produits très périssables** | Incompatible avec délai de livraison 2-7 jours | Post-MVP Phase 3 |
| **Panier multi-vendeurs** | Complexifie le matching (1 rameneur = 1 vendeur = 1 acheteur) | Post-MVP Phase 2 |
| **Matching par itinéraires** | Nécessite intégration GPS temps réel, complexité excessive | Post-MVP Phase 2 |
| **Rayon dynamique** | Simplifié en rayon fixe pour le MVP (cf. Q3) | Post-MVP si données le justifient |
| **Commission variable** | Contraire au principe de simplicité (cf. Q5) | Non prévu |
| **Wallet interne / cashback** | Contrainte réglementaire ACPR | Post-MVP Phase 3 |
| **Paiement à réception** | Complexité juridique, risque d'impayés | Non prévu MVP |
| **Web app** | Mobile-first, budget limité | Post-MVP Phase 2 |
| **Vérification SIRET vendeur** | Frein à l'inscription, complexité admin | Post-MVP Phase 1 |
| **Documents obligatoires rameneur** | Frein à l'inscription, le MVP repose sur la confiance et les notes | Post-MVP Phase 1 |
| **Badge rameneur certifié** | Nécessite volume suffisant pour avoir du sens | Post-MVP Phase 1 |
| **Achats groupés** | Nécessite masse critique d'acheteurs dans une même zone | Post-MVP Phase 3 |
| **Paiement fractionné** | Complexité technique et juridique | Non prévu MVP |
| **Filtres avancés (saisonnalité, distance)** | Les filtres basiques suffisent au MVP | Post-MVP Phase 1 |
| **Analytics CO₂ précis** | Calcul complexe, remplacé par "km évités" (cf. Q7) | Post-MVP Phase 1 |
| **Connexion sociale (Google, Apple)** | Nice-to-have, email suffit | Post-MVP Phase 1 |
| **Partage de produit sur réseaux sociaux** | Non prioritaire au lancement | Post-MVP Phase 1 |
| **Système d'assurance produit/transport** | Complexité juridique, volume insuffisant | Post-MVP Phase 3 |

---

# PARTIE G — MÉTRIQUES ET SUCCÈS

---

## 15. Framework de métriques

### 15.1 North Star Metric

> **Nombre de commandes livrées par mois**

Cette métrique unique reflète la santé globale du système tri-face : elle ne peut croître que si les 3 côtés (vendeurs, acheteurs, rameneurs) fonctionnent correctement.

### 15.2 Métriques par niveau

**Acquisition**

| Métrique | Définition | Objectif Lancement (M1) | Objectif M6 | Objectif M12 |
|----------|-----------|------------------------|-------------|-------------|
| Inscriptions vendeurs | Comptes vendeur créés | 15 | 50 | 150 |
| Inscriptions acheteurs | Comptes acheteur créés | 100 | 500 | 2 000 |
| Inscriptions rameneurs | Comptes rameneur créés | 30 | 100 | 300 |
| Produits en catalogue | Produits actifs | 50 | 300 | 1 000 |

**Activation**

| Métrique | Définition | Objectif Lancement | Objectif M6 | Objectif M12 |
|----------|-----------|-------------------|-------------|-------------|
| Vendeurs avec ≥1 produit | Vendeurs ayant publié | 80% | 85% | 90% |
| Acheteurs avec ≥1 commande | Acheteurs ayant commandé | 30% | 40% | 50% |
| Rameneurs avec ≥1 mission complétée | Rameneurs actifs | 50% | 60% | 70% |

**Engagement**

| Métrique | Définition | Objectif Lancement | Objectif M6 | Objectif M12 |
|----------|-----------|-------------------|-------------|-------------|
| Commandes livrées/mois *(North Star)* | Commandes état TERMINEE | 50 | 300 | 1 500 |
| Panier moyen | Montant moyen par commande | 50 € | 55 € | 60 € |
| Fréquence commande | Commandes/acheteur actif/mois | 1,2 | 1,5 | 2 |
| Missions/rameneur actif/mois | Missions complétées | 2 | 4 | 6 |

**Satisfaction**

| Métrique | Définition | Objectif |
|----------|-----------|---------|
| Note moyenne vendeurs | Moyenne des notes reçues | > 4,0/5 |
| Note moyenne rameneurs | Moyenne des notes reçues | > 4,0/5 |
| NPS (Net Promoter Score) | Enquête trimestrielle | > 30 |
| Taux de litiges | Litiges / commandes terminées | < 5% |

**Opérationnelles**

| Métrique | Définition | Objectif |
|----------|-----------|---------|
| Taux de matching réussi | Commandes matchées / commandes payées | > 80% |
| Délai moyen de livraison | Jours entre paiement et réception confirmée | < 7 jours |
| Taux d'acceptation rameneur | Propositions acceptées / propositions envoyées | > 40% |
| Timeout vendeur | Commandes annulées pour timeout vendeur (48h) | < 10% |

**Financières**

| Métrique | Définition | Objectif M6 | Objectif M12 |
|----------|-----------|-------------|-------------|
| Revenu plateforme/mois | 5% × volume commandes | 825 € | 4 500 € |
| Volume transactionnel/mois | Somme de toutes les commandes | 16 500 € | 90 000 € |
| Coût d'acquisition utilisateur | Budget marketing / nouveaux utilisateurs | < 15 € | < 10 € |

**Écologiques**

| Métrique | Définition | Objectif M6 | Objectif M12 |
|----------|-----------|-------------|-------------|
| Km de transport dédié évités | Distance vendeur→acheteur × commandes livrées | 15 000 km | 75 000 km |
| Trajets mutualisés | Nombre de commandes livrées via trajets existants | 300 | 1 500 |

---

# PARTIE H — ROADMAP PRODUIT

---

## 16. Roadmap par jalons

> Cette roadmap est définie par **résultats utilisateur**, pas par sprints ni par choix techniques. Les durées sont indicatives.

### Jalon 1 — « Le vendeur peut vendre » (Semaines 1-6)

**Résultat** : Un vendeur peut s'inscrire, créer son profil, mettre en ligne ses produits, et un acheteur peut parcourir le catalogue et passer commande.

| Capacité livrée | Epics concernés |
|----------------|----------------|
| Inscription et authentification (3 rôles) | EP01 |
| Profil vendeur complet | EP02 |
| Catalogue produits (ajout, édition, catégorisation) | EP03 |
| Profil acheteur basique | EP04 |
| Navigation catalogue + filtres + fiche produit | EP05 (US-05.01 à 05.03) |
| Panier + commande + paiement | EP05 (US-05.04 à 05.09), EP06 |
| Onboarding vendeur et acheteur | EP13 (US-13.01 à 13.04) |

**Critères de succès** :
- 10+ vendeurs inscrits avec ≥3 produits chacun
- 50+ produits actifs au catalogue
- 20+ commandes passées et payées avec succès
- 0 erreur bloquante sur le parcours inscription → commande

---

### Jalon 2 — « Le rameneur livre » (Semaines 7-12)

**Résultat** : Le cycle complet fonctionne : commande → matching → collecte → livraison → paiement distribué.

| Capacité livrée | Epics concernés |
|----------------|----------------|
| Profil rameneur complet | EP07 |
| Matching automatique (filtrage, scoring, 3 tentatives) | EP08 |
| Machine à états commande (17 états + timeouts) | Section 9 |
| Notifications push (commande, matching, statut) | EP11 |
| Chat par commande | EP09 |
| Onboarding rameneur | EP13 (US-13.05) |
| Distribution automatique des paiements (85/10/5) | EP06 |

**Critères de succès** :
- 20+ rameneurs inscrits dont 10+ actifs
- Taux de matching > 60%
- 30+ commandes livrées de bout en bout
- Délai moyen de livraison < 7 jours
- Paiements distribués correctement à 100%

---

### Jalon 3 — « La communauté fait confiance » (Semaines 13-18)

**Résultat** : Les mécanismes de confiance sont en place, les litiges sont gérables, et la plateforme peut être administrée efficacement.

| Capacité livrée | Epics concernés |
|----------------|----------------|
| Notation réciproque (vendeur ↔ acheteur ↔ rameneur) | EP10 |
| Signalement et gestion litiges 3 niveaux | EP14, Section 12 |
| Back-office complet (dashboard, modération, litiges) | EP12 |
| Suspension automatique | Section 12.4 |
| Checklist de démarrage | EP13 (US-13.06, 13.07) |

**Critères de succès** :
- Note moyenne globale > 4/5
- Taux de litiges < 5%
- 100% des litiges résolus en < 72h
- Admin peut gérer la plateforme seul via le back-office
- Taux de matching > 80%

---

### Jalon 4 — « Le pilote est lancé » (Semaines 19-22)

**Résultat** : La plateforme est en production avec de vrais utilisateurs.

| Capacité livrée | Epics concernés |
|----------------|----------------|
| Tests de bout en bout avec utilisateurs beta | — |
| Corrections et stabilisation | — |
| KPIs écologiques affichés | US-12.15 |
| Export CSV et logs d'audit | US-12.12, US-12.13 |
| Guides utilisateurs (vendeur, acheteur, rameneur) | — |

**Critères de succès** :
- 50+ commandes livrées le premier mois
- Taux de matching > 80%
- Note moyenne > 4/5
- 0 incident critique
- North Star : 50 commandes livrées/mois

---

### Vision post-MVP

| Phase | Horizon | Fonctionnalités clés |
|-------|---------|---------------------|
| **Post-MVP Phase 1** | M4-M6 après lancement | Badge rameneur certifié, vérification SIRET vendeur, filtres avancés, connexion sociale, analytics CO₂ |
| **Post-MVP Phase 2** | M7-M12 | Produits frais (protocole chaîne du froid), panier multi-vendeurs, matching par itinéraires, densification du réseau |
| **Post-MVP Phase 3** | M13-M24 | Achats groupés, wallet interne, système d'assurance, partenariats grande distribution locale |

---

# PARTIE I — ANNEXES

---

## 17. Annexes

### 17.1 Matrice de traçabilité US / Epics / Jalons

| Epic | Jalon | Nombre US | Priorité dominante |
|------|-------|-----------|-------------------|
| EP01 - Authentification | J1 | 13 | Must |
| EP02 - Profil Vendeur | J1 | 6 | Must |
| EP03 - Catalogue Produits | J1 | 10 | Must |
| EP04 - Profil Acheteur | J1 | 5 | Must |
| EP05 - Panier & Commande | J1 | 9 | Must |
| EP06 - Paiement | J1+J2 | 8 | Must |
| EP07 - Profil Rameneur | J2 | 8 | Must |
| EP08 - Matching | J2 | 10 | Must |
| EP09 - Communication | J2 | 6 | Must |
| EP10 - Notation & Avis | J3 | 8 | Must |
| EP11 - Notifications | J2 | 6 | Must |
| EP12 - Back-office | J3+J4 | 16 | Must |
| EP13 - Onboarding | J1+J2+J3 | 7 | Must/Should |
| EP14 - Cas exceptionnels | J3 | 12 | Must |

### 17.2 Récapitulatif par priorité

| Priorité | Nombre d'US | % du total |
|----------|-------------|-----------|
| **Must** | 97 | 78% |
| **Should** | 22 | 18% |
| **Could** | 5 | 4% |
| **Total** | **124** | 100% |

### 17.3 Questions tranchées — Récapitulatif

| # | Question | Décision | Section |
|---|----------|----------|---------|
| Q1 | Produits transformés au MVP ? | OUI, secs uniquement | §7 Q1 |
| Q2 | Limite par commande ? | OUI, 15 kg / 150 € | §7 Q2 |
| Q3 | Rayon fixe ou dynamique ? | FIXE (15 km vendeur, 10 km acheteur) | §7 Q3 |
| Q4 | Rémunération minimum rameneur ? | OUI, plancher 5 € | §7 Q4 |
| Q5 | Commission variable ? | NON, fixe 5% | §7 Q5 |
| Q6 | Mécanisme litiges ? | OUI, 3 niveaux | §7 Q6, §12 |
| Q7 | KPIs écologiques ? | Km évités (principal) | §7 Q7 |

### 17.4 Référence aux documents sources

Ce PRD consolide et remplace les documents suivants :

| Document | Fichier | Statut |
|----------|---------|--------|
| Étude de marché | `documentation/etude_marche_v1.md` | Synthétisé en §3 |
| User Stories | `documentation/user_stories_v1.md` | Intégré et étendu en §11 |
| Roadmap Produit | `documentation/roadmap_produit_v1.md` | Refondu en §16 (purgé du technique) |
| Cahier des Charges | `documentation/cahier_des_charges_complet.pdf` | Intégré et complété dans l'ensemble du PRD |

### 17.5 Changelog

| Version | Date | Modifications |
|---------|------|-------------|
| 1.0 | 2025-02-11 | Création initiale — Consolidation des 4 documents sources en PRD unique |
