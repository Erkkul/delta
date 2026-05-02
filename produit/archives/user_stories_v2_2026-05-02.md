# User Stories MVP — Delta

**Version** : v2 — 2026-05-02
**Statut** : Mise à jour majeure — reflet des décisions produit du 2026-05-01

> ⚠️ **Note de version** : Cette v2 intègre l'inversion du modèle d'expérience (rameneur = initiateur), la suppression du matching automatique algorithmique, le remplacement du panier/commande classique par la wishlist acheteur + flow escrow, et l'alignement terminologique (producteur, non vendeur).

---

## Vue d'ensemble des épics

| Epic | Description | Sprint cible |
|------|-------------|--------------|
| EP01 — Authentification & Comptes | Inscription, connexion, RGPD | Sprint 1 |
| EP02 — Profil Producteur | Onboarding, profil, Stripe Connect | Sprint 1–2 |
| EP03 — Catalogue Produits | Création, édition, stock, statuts | Sprint 2 |
| EP04 — Profil Acheteur | Onboarding, zone, préférences | Sprint 1–2 |
| EP05 — Wishlist & Matching Acheteur | Catalogue filtré, wishlist, match, paiement | Sprint 3–4 |
| EP06 — Paiement & Escrow | Stripe, split, remboursements | Sprint 3 |
| EP07 — Profil Rameneur | Onboarding, véhicule, Stripe Identity | Sprint 4 |
| EP08 — Trajet & Opportunités | Déclaration trajet, vue opportunités, réservation mission | Sprint 4–5 |
| EP09 — Missions Actives & QR Codes | Suivi mission, QR pickup, QR delivery | Sprint 5 |
| EP10 — Communication (Chat) | Chat par mission | Sprint 6 |
| EP11 — Notation & Avis | Notes post-livraison | Sprint 7 |
| EP12 — Notifications | Push, in-app, emails transactionnels | Sprint 5–7 |
| EP13 — Back-office Administration | Tableau de bord, modération | Sprint 8 |

---

## EP01 — Authentification & Gestion des Comptes

| ID | User Story | Priorité |
|----|------------|----------|
| US-01.01 | **En tant que** visiteur, **je veux** créer un compte avec mon email et mot de passe **afin de** accéder aux fonctionnalités de la plateforme | Must |
| US-01.02 | **En tant que** visiteur, **je veux** choisir mon type de profil (producteur / acheteur / rameneur) lors de l'inscription **afin de** accéder aux fonctionnalités adaptées à mon rôle | Must |
| US-01.03 | **En tant que** utilisateur inscrit, **je veux** recevoir un email de confirmation **afin de** valider mon adresse email | Must |
| US-01.04 | **En tant que** utilisateur inscrit, **je veux** me connecter avec mes identifiants **afin de** accéder à mon espace personnel | Must |
| US-01.05 | **En tant que** utilisateur connecté, **je veux** me déconnecter **afin de** sécuriser mon compte | Must |
| US-01.06 | **En tant que** utilisateur, **je veux** réinitialiser mon mot de passe via email **afin de** récupérer l'accès si je l'ai oublié | Must |
| US-01.07 | **En tant que** utilisateur, **je veux** modifier mon mot de passe **afin de** sécuriser mon compte | Should |
| US-01.08 | **En tant que** utilisateur, **je veux** supprimer mon compte **afin de** exercer mon droit à l'oubli (RGPD) | Must |
| US-01.09 | **En tant que** utilisateur, **je veux** consulter et accepter les CGU/CGV lors de l'inscription **afin de** comprendre mes droits et obligations | Must |
| US-01.10 | **En tant que** utilisateur, **je veux** donner mon consentement explicite pour le traitement de mes données **afin de** respecter la conformité RGPD | Must |
| US-01.11 | **En tant que** utilisateur, **je veux** rester connecté sur mon appareil mobile **afin de** ne pas avoir à me reconnecter à chaque utilisation | Should |
| US-01.12 | **En tant que** utilisateur, **je veux** être informé si mon email est déjà utilisé lors de l'inscription **afin de** comprendre pourquoi elle échoue | Must |

---

## EP02 — Profil Producteur

| ID | User Story | Priorité |
|----|------------|----------|
| US-02.01 | **En tant que** producteur, **je veux** renseigner mes informations de profil (nom, description, photo) **afin de** me présenter aux acheteurs et rameneurs | Must |
| US-02.02 | **En tant que** producteur, **je veux** renseigner l'adresse exacte de ma ferme ou point de collecte **afin que** les rameneurs sachent où récupérer les produits | Must |
| US-02.03 | **En tant que** producteur, **je veux** connecter mon compte bancaire via Stripe Connect (KYC léger + IBAN) **afin de** recevoir mes paiements automatiquement | Must |
| US-02.04 | **En tant que** producteur, **je veux** modifier mes informations de profil **afin de** les maintenir à jour | Must |
| US-02.05 | **En tant que** producteur, **je veux** visualiser mon profil public **afin de** voir comment il apparaît aux acheteurs et rameneurs | Should |
| US-02.06 | **En tant que** producteur, **je veux** accéder à mon tableau de bord **afin de** avoir une vue d'ensemble de mon activité (prochaines récupérations, ventes en cours, KPIs) | Must |
| US-02.07 | **En tant que** producteur, **je veux** consulter l'historique de mes ventes et virements Stripe **afin de** suivre ma comptabilité | Must |

---

## EP03 — Catalogue Produits

| ID | User Story | Priorité |
|----|------------|----------|
| US-03.01 | **En tant que** producteur, **je veux** créer un produit avec nom, description, catégorie, prix net, stock et fenêtre de disponibilité **afin de** le proposer à la vente sur Delta | Must |
| US-03.02 | **En tant que** producteur, **je veux** ajouter 1 à 4 photos pour mon produit et les réordonner par drag-and-drop (la première étant la photo de couverture) **afin de** le présenter visuellement | Must |
| US-03.03 | **En tant que** producteur, **je veux** catégoriser mon produit (produits secs, agricoles non sensibles) **afin de** faciliter sa découverte | Must |
| US-03.04 | **En tant que** producteur, **je veux** définir librement mon prix net **afin de** fixer ma politique tarifaire — le prix final acheteur (incluant les commissions) étant calculé et affiché automatiquement | Must |
| US-03.05 | **En tant que** producteur, **je veux** renseigner le stock disponible et un seuil d'alerte **afin d'** être notifié quand mon stock approche zéro | Must |
| US-03.06 | **En tant que** producteur, **je veux** ajouter des labels qualité optionnels (Bio AB, Demeter, Nature & Progrès, Label Rouge) **afin de** valoriser mes certifications | Should |
| US-03.07 | **En tant que** producteur, **je veux** modifier les informations d'un produit existant **afin de** corriger ou mettre à jour les détails | Must |
| US-03.08 | **En tant que** producteur, **je veux** supprimer un produit **afin de** retirer un article que je ne vends plus | Must |
| US-03.09 | **En tant que** producteur, **je veux** passer un produit de Brouillon à Actif, ou le Désactiver temporairement **afin de** gérer sa visibilité sans le supprimer | Must |
| US-03.10 | **En tant que** producteur, **je veux** voir le statut de stock de mon produit passer automatiquement à « Épuisé » quand le stock atteint zéro **afin d'** éviter toute réservation impossible | Must |
| US-03.11 | **En tant que** producteur, **je veux** visualiser la liste de tous mes produits avec leur statut (Actif / Brouillon / Désactivé / Épuisé) **afin de** gérer mon catalogue | Must |
| US-03.12 | **En tant que** producteur, **je veux** être informé si mon produit ne respecte pas les catégories autorisées (pas de frais, pas d'alcool) **afin de** comprendre pourquoi il est refusé | Should |
| US-03.13 | **En tant que** producteur, **je veux** dupliquer un produit existant **afin de** créer rapidement des variantes similaires | Could |

---

## EP04 — Profil Acheteur

| ID | User Story | Priorité |
|----|------------|----------|
| US-04.01 | **En tant qu'** acheteur, **je veux** renseigner mon nom et ma zone d'habitation (code postal / quartier) lors de l'onboarding **afin que** le catalogue me montre uniquement les produits livrables dans ma zone | Must |
| US-04.02 | **En tant qu'** acheteur, **je veux** indiquer mes préférences de catégories (ex : maraîchage, épicerie sèche) **afin de** personnaliser mon accueil | Should |
| US-04.03 | **En tant qu'** acheteur, **je veux** modifier ma zone et mes préférences **afin de** les maintenir à jour | Must |
| US-04.04 | **En tant qu'** acheteur, **je veux** accéder à l'historique de mes commandes livrées **afin de** retrouver mes achats passés et télécharger mes factures | Must |
| US-04.05 | **En tant qu'** acheteur, **je veux** gérer mes moyens de paiement enregistrés **afin de** simplifier mes confirmations de match futures | Could |

> **Note** : L'adresse postale exacte de l'acheteur n'est pas communiquée aux rameneurs avant confirmation de mission. Seule la zone (code postal / quartier) est partagée. Le point de RDV final est négocié dans le chat de mission.

---

## EP05 — Wishlist & Matching Acheteur

> Ce parcours remplace intégralement l'ancien modèle panier / commande. L'acheteur ne "commande" pas directement : il exprime des envies, et c'est le rameneur qui déclenche la mission.

| ID | User Story | Priorité |
|----|------------|----------|
| US-05.01 | **En tant qu'** acheteur, **je veux** parcourir un catalogue filtré aux produits réellement matchables dans ma zone **afin d'** éviter d'ajouter des envies impossibles à satisfaire | Must |
| US-05.02 | **En tant qu'** acheteur, **je veux** voir un écran "zone non couverte" avec une invitation à m'inscrire sur liste d'attente si aucun rameneur n'est actif dans ma zone **afin que** la plateforme capture ma demande latente | Must |
| US-05.03 | **En tant qu'** acheteur, **je veux** filtrer le catalogue par catégorie, zone d'origine du producteur et fenêtre de disponibilité **afin de** trouver ce qui m'intéresse | Must |
| US-05.04 | **En tant qu'** acheteur, **je veux** consulter la fiche détaillée d'un produit (photos, description, prix final acheteur, profil producteur) **afin d'** obtenir toutes les informations avant d'ajouter à mes envies | Must |
| US-05.05 | **En tant qu'** acheteur, **je veux** accéder au profil public du producteur depuis la fiche produit **afin de** comprendre qui il est et évaluer la fiabilité | Must |
| US-05.06 | **En tant qu'** acheteur, **je veux** ajouter un produit à ma wishlist privée **afin d'** exprimer mon envie d'en recevoir | Must |
| US-05.07 | **En tant qu'** acheteur, **je veux** consulter ma wishlist et voir le statut de chaque envie (En attente / Probable / Matché) **afin de** suivre mes demandes | Must |
| US-05.08 | **En tant qu'** acheteur, **je veux** retirer un produit de ma wishlist **afin d'** annuler une envie qui ne m'intéresse plus | Must |
| US-05.09 | **En tant qu'** acheteur, **je veux** recevoir une notification quand un rameneur peut satisfaire une de mes envies (ex : *« Pierre peut vous ramener du miel de Normandie jeudi »*) **afin d'** être informé et pouvoir confirmer | Must |
| US-05.10 | **En tant qu'** acheteur, **je veux** voir le récapitulatif complet du match (produit, producteur, rameneur, prix final, dates estimées) avant de confirmer **afin de** prendre une décision éclairée | Must |
| US-05.11 | **En tant qu'** acheteur, **je veux** confirmer le match et procéder au paiement dans un délai de 24 h **afin de** valider la mission | Must |
| US-05.12 | **En tant qu'** acheteur, **je veux** être informé que le prix appliqué est celui du producteur au moment du match (non celui affiché lors de l'ajout à la wishlist) **afin d'** éviter toute surprise | Must |
| US-05.13 | **En tant qu'** acheteur, **je veux** pouvoir refuser un match sans pénalité la première fois dans un mois glissant **afin de** garder une liberté de choix raisonnable | Must |
| US-05.14 | **En tant qu'** acheteur, **je veux** recevoir un avertissement explicite lors de mon deuxième refus dans un mois glissant **afin d'** être prévenu des conséquences d'un troisième refus | Must |
| US-05.15 | **En tant qu'** acheteur, **je veux** voir mon compte suspendu temporairement si je refuse trois matches ou plus dans un mois glissant **afin que** la plateforme préserve la confiance des rameneurs | Must |

---

## EP06 — Paiement & Escrow Stripe

| ID | User Story | Priorité |
|----|------------|----------|
| US-06.01 | **En tant qu'** acheteur, **je veux** payer ma commande de manière sécurisée par carte bancaire, Apple Pay ou Google Pay via Stripe **afin de** valider la mission | Must |
| US-06.02 | **En tant qu'** acheteur, **je veux** recevoir une confirmation de paiement par email avec le récapitulatif de la mission **afin d'** avoir une preuve de transaction | Must |
| US-06.03 | **En tant que** producteur, **je veux** avoir connecté mon compte bancaire (Stripe Connect, KYC léger + IBAN) **afin de** recevoir automatiquement 85 % du montant après confirmation de livraison | Must |
| US-06.04 | **En tant que** rameneur, **je veux** avoir enregistré mon IBAN via Stripe **afin de** recevoir automatiquement 10 % du montant après confirmation de livraison | Must |
| US-06.05 | **En tant qu'** acheteur, **je veux** être remboursé intégralement si la mission est annulée avant le pickup (aucun rameneur, rupture de stock, mission non complétée) **afin de** ne jamais payer pour un produit non reçu | Must |
| US-06.06 | **En tant qu'** acheteur, **je veux** savoir que mon paiement est gardé en escrow jusqu'à la livraison effective **afin de** me sentir protégé en cas de problème | Must |
| US-06.07 | **En tant qu'** acheteur, **je veux** télécharger ma facture au format PDF **afin de** conserver une preuve d'achat | Should |

---

## EP07 — Profil Rameneur

| ID | User Story | Priorité |
|----|------------|----------|
| US-07.01 | **En tant que** rameneur, **je veux** créer mon profil avec nom et photo **afin de** me présenter aux producteurs et acheteurs | Must |
| US-07.02 | **En tant que** rameneur, **je veux** déclarer ma capacité de transport par défaut (sac / coffre / break) **afin de** recevoir des opportunités adaptées à mon véhicule | Must |
| US-07.03 | **En tant que** rameneur, **je veux** vérifier mon identité via Stripe Identity (vérification légère) **afin d'** inspirer confiance aux acheteurs et producteurs | Must |
| US-07.04 | **En tant que** rameneur, **je veux** enregistrer mon IBAN via Stripe **afin de** recevoir mes rémunérations après chaque mission | Must |
| US-07.05 | **En tant que** rameneur, **je veux** accéder à mon tableau de bord (trajets actifs, opportunités à explorer, revenus du mois) **afin de** suivre mon activité | Must |
| US-07.06 | **En tant que** rameneur, **je veux** consulter mon historique de missions et mes virements Stripe **afin de** suivre mes revenus | Should |
| US-07.07 | **En tant que** rameneur, **je veux** me désactiver temporairement (pause / vacances) **afin de** ne plus apparaître dans les opportunités pendant une période | Should |

> **Décisions actées** : La rémunération du rameneur est fixée à 10 % (non configurable en MVP). Il n'y a pas de rayon géographique statique ni de plages horaires de disponibilité — la disponibilité est déclarée trajet par trajet.

---

## EP08 — Déclaration de Trajet & Opportunités

> C'est l'épic central de Delta. Le rameneur est l'initiateur : il déclare son trajet, consulte les opportunités calculées, et réserve une mission. Remplace intégralement l'ancien EP08 (matching automatique algorithmique) qui a été abandonné.

| ID | User Story | Priorité |
|----|------------|----------|
| US-08.01 | **En tant que** rameneur, **je veux** déclarer un trajet en saisissant l'origine, la destination, la date aller et la date de retour **afin de** déclencher le calcul des opportunités disponibles | Must |
| US-08.02 | **En tant que** rameneur, **je veux** bénéficier de l'autocomplétion pour saisir les villes et adresses (via l'API Adresse Gouv.fr) **afin de** gagner du temps et éviter les erreurs | Must |
| US-08.03 | **En tant que** rameneur, **je veux** préciser ma capacité de transport pour ce trajet (sac / coffre / break) **afin que** les opportunités proposées correspondent à ce que je peux transporter | Must |
| US-08.04 | **En tant que** rameneur, **je veux** voir la liste des opportunités calculées sur mon trajet, triées par gain net estimé **afin de** choisir la mission la plus intéressante | Must |
| US-08.05 | **En tant que** rameneur, **je veux** consulter le détail d'une opportunité (producteur avec profil, produits concernés, nombre et zone des acheteurs anonymisés, gain net estimé, détour estimé) **afin de** décider si cela m'intéresse | Must |
| US-08.06 | **En tant que** rameneur, **je veux** réserver une mission d'un seul clic **afin de** la verrouiller avant un autre rameneur | Must |
| US-08.07 | **En tant que** rameneur, **je veux** être informé si une opportunité a déjà été réservée par un autre rameneur entre le moment où je l'ai vue et celui où je clique **afin de** comprendre pourquoi elle n'est plus disponible | Must |
| US-08.08 | **En tant que** rameneur, **je veux** gérer mes trajets déclarés (consulter, modifier, annuler) **afin de** adapter ma disponibilité | Must |
| US-08.09 | **En tant que** rameneur, **je veux** voir une opportunité disparaître de ma liste dès qu'elle est réservée par un autre rameneur **afin que** ma liste reste à jour | Must |
| US-08.10 | **En tant que** système, **je veux** calculer automatiquement les opportunités de missions à partir d'un trajet déclaré en croisant les wishlist acheteurs et les stocks producteurs sur le tracé **afin de** proposer des missions pertinentes au rameneur | Must |

---

## EP09 — Missions Actives & QR Codes

> Couvre le déroulement opérationnel d'une mission une fois réservée : confirmation acheteur, pickup chez le producteur, delivery chez les acheteurs, et gestion des cas limites.

### Côté Rameneur

| ID | User Story | Priorité |
|----|------------|----------|
| US-09.01 | **En tant que** rameneur, **je veux** consulter la liste de mes missions par statut (En attente de confirmation acheteur / Confirmée / En cours / Livrée) **afin de** savoir où j'en suis | Must |
| US-09.02 | **En tant que** rameneur, **je veux** voir mon QR code de pickup s'activer dès que la mission passe en état « Confirmée » **afin d'** être prêt à le présenter chez le producteur | Must |
| US-09.03 | **En tant que** rameneur, **je veux** voir la liste des livraisons à effectuer pour ma mission en cours, avec la zone de chaque acheteur **afin de** planifier mon circuit de livraison | Must |
| US-09.04 | **En tant que** rameneur, **je veux** afficher le QR code de delivery propre à chaque acheteur **afin que** l'acheteur puisse le scanner pour confirmer la remise | Must |
| US-09.05 | **En tant que** rameneur, **je veux** signaler une rupture de stock chez le producteur à l'arrivée **afin de** déclencher l'annulation de la mission et le remboursement des acheteurs | Must |
| US-09.06 | **En tant que** rameneur, **je veux** signaler via l'app qu'un acheteur est absent au point de RDV après 30 min d'attente **afin de** enclencher la procédure no-show | Must |

### Côté Producteur

| ID | User Story | Priorité |
|----|------------|----------|
| US-09.07 | **En tant que** producteur, **je veux** voir les récupérations à venir avec le détail de la mission (rameneur, produits commandés, date et créneau estimé) **afin de** préparer les commandes | Must |
| US-09.08 | **En tant que** producteur, **je veux** cocher chaque produit dans une checklist avant de valider la remise **afin d'** éviter les erreurs de préparation | Must |
| US-09.09 | **En tant que** producteur, **je veux** scanner le QR code du rameneur pour confirmer la remise des produits **afin de** valider officiellement le pickup et déclencher la suite de la mission | Must |
| US-09.10 | **En tant que** producteur, **je veux** signaler une rupture de stock avant l'arrivée du rameneur **afin de** prévenir à temps et éviter un déplacement inutile | Must |

### Côté Acheteur

| ID | User Story | Priorité |
|----|------------|----------|
| US-09.11 | **En tant qu'** acheteur, **je veux** suivre visuellement les étapes de ma commande (en attente / confirmée / pickup effectué / livraison en cours / livrée) **afin de** savoir où se trouve mon produit | Must |
| US-09.12 | **En tant qu'** acheteur, **je veux** afficher mon QR code de delivery en plein écran **afin de** le présenter facilement au rameneur lors de la remise | Must |
| US-09.13 | **En tant qu'** acheteur, **je veux** recevoir une notification dès que le rameneur a effectué le pickup chez le producteur **afin d'** être prévenu que la livraison approche | Must |

---

## EP10 — Communication (Chat)

| ID | User Story | Priorité |
|----|------------|----------|
| US-10.01 | **En tant qu'** utilisateur (producteur / acheteur / rameneur), **je veux** accéder à un chat lié à la mission **afin de** coordonner la récupération ou la livraison | Must |
| US-10.02 | **En tant qu'** utilisateur, **je veux** envoyer des messages texte dans le chat **afin de** convenir d'un point de RDV ou prévenir d'un retard | Must |
| US-10.03 | **En tant qu'** utilisateur, **je veux** consulter l'historique des messages d'une mission **afin de** retrouver les informations échangées | Must |
| US-10.04 | **En tant qu'** utilisateur, **je veux** être notifié des nouveaux messages **afin de** répondre rapidement | Must |
| US-10.05 | **En tant qu'** utilisateur, **je veux** voir les messages non lus clairement identifiés **afin de** ne pas manquer d'informations | Should |
| US-10.06 | **En tant qu'** utilisateur, **je veux** accéder à la liste de toutes mes conversations actives **afin de** gérer mes échanges | Should |

---

## EP11 — Notation & Avis

| ID | User Story | Priorité |
|----|------------|----------|
| US-11.01 | **En tant qu'** acheteur, **je veux** noter le producteur (1–5 étoiles) après livraison confirmée **afin de** partager mon expérience sur la qualité du produit | Must |
| US-11.02 | **En tant qu'** acheteur, **je veux** noter le rameneur (1–5 étoiles) après livraison confirmée **afin d'** évaluer la qualité du transport | Must |
| US-11.03 | **En tant que** producteur, **je veux** noter le rameneur (1–5 étoiles) après livraison confirmée **afin d'** évaluer le soin apporté aux produits | Must |
| US-11.04 | **En tant qu'** utilisateur, **je veux** ajouter un commentaire optionnel à ma notation **afin de** détailler mon avis | Should |
| US-11.05 | **En tant qu'** utilisateur, **je veux** voir la note moyenne d'un producteur sur son profil public **afin d'** évaluer sa fiabilité avant d'ajouter un produit à ma wishlist | Must |
| US-11.06 | **En tant qu'** utilisateur, **je veux** voir la note moyenne d'un rameneur **afin d'** évaluer sa fiabilité | Must |
| US-11.07 | **En tant que** producteur ou rameneur, **je veux** voir les avis reçus sur mon profil **afin de** connaître ma réputation et progresser | Should |
| US-11.08 | **En tant qu'** utilisateur, **je veux** être invité à noter uniquement après passage en état `closed` (livraison confirmée) **afin d'** évaluer sur une base réelle | Must |

---

## EP12 — Notifications

| ID | User Story | Priorité |
|----|------------|----------|
| US-12.01 | **En tant que** producteur, **je veux** recevoir une notification push dès qu'une mission incluant mes produits est réservée par un rameneur **afin de** préparer la commande à temps | Must |
| US-12.02 | **En tant que** rameneur, **je veux** recevoir une notification push dès que des acheteurs confirment ma mission **afin de** savoir qu'elle est validée | Must |
| US-12.03 | **En tant qu'** acheteur, **je veux** recevoir une notification push dès qu'un rameneur peut satisfaire une de mes envies **afin de** confirmer dans les 24 h | Must |
| US-12.04 | **En tant qu'** acheteur, **je veux** recevoir une notification push dès que le rameneur effectue le pickup **afin d'** être prévenu que la livraison est en route | Must |
| US-12.05 | **En tant qu'** utilisateur, **je veux** recevoir une notification à chaque changement d'état de ma mission **afin de** suivre son avancement | Must |
| US-12.06 | **En tant qu'** utilisateur, **je veux** recevoir une notification in-app pour les nouveaux messages de chat **afin de** ne pas manquer d'échanges | Must |
| US-12.07 | **En tant que** producteur, **je veux** recevoir une notification quand un produit atteint son seuil d'alerte de stock **afin de** réapprovisionner à temps | Must |
| US-12.08 | **En tant qu'** utilisateur, **je veux** gérer mes préférences de notifications **afin de** contrôler les alertes que je reçois | Could |

---

## EP13 — Back-office Administration

| ID | User Story | Priorité |
|----|------------|----------|
| US-13.01 | **En tant qu'** administrateur, **je veux** accéder à un tableau de bord avec les KPIs clés (missions, volume vendu, revenus plateforme, taux de complétion) **afin de** piloter l'activité | Must |
| US-13.02 | **En tant qu'** administrateur, **je veux** visualiser le nombre de trajets déclarés et de missions réservées / complétées **afin de** mesurer l'activité rameneur | Must |
| US-13.03 | **En tant qu'** administrateur, **je veux** visualiser le volume de produits vendus (€ et unités) **afin de** mesurer la performance | Must |
| US-13.04 | **En tant qu'** administrateur, **je veux** visualiser les revenus de la plateforme (5 %) **afin de** suivre la rentabilité | Must |
| US-13.05 | **En tant qu'** administrateur, **je veux** consulter la liste des utilisateurs par type (producteur / acheteur / rameneur) **afin de** gérer la communauté | Must |
| US-13.06 | **En tant qu'** administrateur, **je veux** suspendre ou réactiver un compte utilisateur **afin de** modérer les comportements inappropriés | Must |
| US-13.07 | **En tant qu'** administrateur, **je veux** consulter la liste des produits et leurs statuts **afin de** valider ou modérer le catalogue | Must |
| US-13.08 | **En tant qu'** administrateur, **je veux** désactiver un produit non conforme **afin de** garantir le respect des règles (pas de frais, pas d'alcool) | Must |
| US-13.09 | **En tant qu'** administrateur, **je veux** consulter le détail des missions et transactions **afin d'** investiguer les problèmes et litiges | Must |
| US-13.10 | **En tant qu'** administrateur, **je veux** gérer les signalements et litiges (no-show acheteur, rupture stock, abandon rameneur) **afin de** résoudre les conflits | Must |
| US-13.11 | **En tant qu'** administrateur, **je veux** modérer les avis inappropriés **afin de** garantir un contenu respectueux | Must |
| US-13.12 | **En tant qu'** administrateur, **je veux** exporter les données en CSV **afin de** réaliser des analyses externes | Should |
| US-13.13 | **En tant qu'** administrateur, **je veux** consulter les logs d'audit **afin de** tracer les actions importantes | Should |
| US-13.14 | **En tant qu'** administrateur, **je veux** visualiser le taux de missions réservées vs. effectivement livrées **afin d'** évaluer la qualité de l'expérience | Must |
| US-13.15 | **En tant qu'** administrateur, **je veux** consulter la liste des acheteurs en zone non couverte (liste d'attente AC-12) **afin de** prioriser l'acquisition de rameneurs dans ces zones | Must |

---

## Récapitulatif par Priorité

| Priorité | Nombre d'US | Description |
|----------|-------------|-------------|
| **Must** | 85 | Indispensables au MVP |
| **Should** | 17 | Importantes, à inclure si possible |
| **Could** | 3 | Souhaitables, peuvent être reportées |

---

## Ce qui a changé vs. v1

| Épic | Changement |
|------|-----------|
| EP02 (ex-Profil Vendeur) | Renommé Producteur ; adresse ferme obligatoire ; Stripe Connect explicité ; historique ventes ajouté |
| EP03 (Catalogue) | Stock + seuil d'alerte obligatoires ; 3 statuts explicités (Actif/Brouillon/Désactivé) + Épuisé automatique ; 1–4 photos drag-and-drop ; labels bio optionnels ; affichage prix tout compris |
| EP04 (Profil Acheteur) | Zone pour catalogue filtré (non pour matching) ; adresse exacte non exposée en clair |
| EP05 (ex-Panier & Commande) | **Entièrement refait en Wishlist & Matching** : plus de panier, wishlist privée, confirmation post-match, prix au moment du match, pénalités crescendo, zone non couverte |
| EP06 (Paiement) | Escrow explicité ; paiement à la confirmation de match (non à la commande) ; no-show géré |
| EP07 (Profil Rameneur) | Rayon géographique statique supprimé ; disponibilités horaires supprimées ; rémunération 10 % non configurable ; capacité véhicule ajoutée |
| EP08 (ex-Matching Auto) | **Entièrement refait en Trajet & Opportunités** : le rameneur initie, le système calcule en arrière-plan |
| EP09 (Missions & QR) | **Nouveau** : pickup QR + checklist producteur + delivery QR acheteur + no-show + signalement rupture |
| EP12 (Notifications) | Mis à jour pour refléter le nouveau flow (notification match → acheteur, alerte stock producteur) |
| EP13 (ex-EP12 Admin) | Renuméroté ; "taux matching algorithmique" remplacé par taux missions réservées/livrées ; liste d'attente zones non couvertes ajoutée |

---

## Légende des priorités (MoSCoW)

- **Must** : Fonctionnalité indispensable au MVP, bloquante si absente
- **Should** : Fonctionnalité importante qui améliore significativement l'UX
- **Could** : Fonctionnalité souhaitable mais non critique pour le lancement
- **Won't** : Hors scope MVP (non listé ici — voir `CLAUDE.md` section "Hors scope MVP")
