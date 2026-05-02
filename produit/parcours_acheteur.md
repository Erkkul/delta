# Parcours Acheteur — Delta

**Version** : v1 — 2026-05-01
**Statut** : Brouillon — à valider avant maquettes
**Auteur** : Julien + Claude

Ce document décrit le **parcours complet de l'acheteur** dans Delta : de la découverte des produits jusqu'à la livraison et la notation. Il complète `sitemap.md` (qui liste les écrans) et `flow_mission.md` (qui décrit le cycle de vie côté mission). Ici on prend le point de vue acheteur.

---

## Hypothèses structurantes (validées)

Trois hypothèses structurent tout le parcours.

| # | Hypothèse | Statut |
|---|-----------|--------|
| H1 | La wishlist contient des **produits spécifiques** d'un producteur identifié (pas d'envies génériques). L'acheteur parcourt un catalogue, ajoute un produit précis. | ✅ Validé 2026-05-01 |
| H2 | L'acheteur **paye après** la notification de match (Stripe au moment de l'AC-07), pas en pré-autorisation. Délai 24h pour confirmer. | ✅ Validé (cf. `flow_mission.md`) |
| H3 | Le catalogue parcourable ne montre que les produits **matchables** : ceux dont au moins un rameneur a déjà fait des trajets compatibles récemment. Pas de catalogue théorique exhaustif. | ✅ Validé 2026-05-01 |

---

## Contexte persona

**Acheteur Delta** : citadin parisien (cible pilote), 25-50 ans, sensible au local et au bio, souvent sans voiture. Frustré par le prix des AMAP saturées et la qualité décevante des supermarchés bio. Achète déjà occasionnellement sur La Ruche Qui Dit Oui ou en marché. **Mobile-first** : il consulte l'appli dans les transports, ajoute des envies pendant les temps morts.

Ce qu'il cherche dans Delta vs alternatives :
- **Vs AMAP** : pas d'engagement contraignant, pas de panier imposé
- **Vs supermarché bio** : provenance vérifiable, prix juste pour le producteur
- **Vs livraison classique** : empreinte carbone faible (trajets existants), parfois moins cher

Ce qu'il accepte vs alternatives :
- Délai variable (pas de "demain 18h garanti")
- Récupérer en main propre (pas de boîte aux lettres)
- Possibilité d'annulation si pas de match

---

## Vue d'ensemble du parcours

Le parcours acheteur se découpe en **5 phases**, dont 3 sont actives (l'acheteur agit) et 2 sont passives (il attend que le système / un rameneur agisse).

```
[ DÉCOUVERTE ]  →  [ WISHLIST ]  →  ░ ATTENTE MATCH ░  →  [ CONFIRMATION ]  →  ░ ATTENTE LIVRAISON ░  →  [ RÉCEPTION ]  →  [ NOTATION ]
   actif            actif              passif                  actif                   passif                  actif           actif
   AC-03/04/05      AC-05/06         (push notif)             AC-07                  (push notif)             AC-08            AC-10
```

Le moment-clé : la **bascule de passif → actif au match**. L'acheteur ne contrôle ni quand un rameneur va proposer, ni si ça arrivera. C'est la principale différence avec un Greenweez classique.

---

## Phase 1 — Découverte

**Objectif acheteur** : trouver des produits qui m'intéressent et comprendre que je peux les obtenir.
**Objectif Delta** : alimenter la wishlist (signal de demande).

### Écrans concernés
- **AC-03 Accueil** — landing après login
- **AC-04 Catalogue parcourable** — exploration libre
- **AC-05 Fiche produit** — décision d'ajout

### Logique d'AC-03 (Accueil)

Sections, dans cet ordre, mobile-first :

1. **Header personnalisé** : *« Bonjour Marie, voici ce qui peut arriver chez vous »*
2. **Bandeau "Disponible cette semaine"** (≤ 3 cards) : produits pour lesquels un rameneur a déjà déclaré un trajet compatible avec ta zone et que tu n'as pas encore mis en wishlist. CTA *« Ajouter à mes envies »*. → c'est la conversion la plus directe en mission.
3. **Bloc "Mes envies en cours"** (≤ 3 cards résumées) : statut de chaque envie (En attente / Match probable / Match trouvé). Lien vers AC-06.
4. **Bloc "Découvrir"** : 4-6 fiches producteurs ou catégories pour onboarder un acheteur sans envies.
5. **Footer nav** : Accueil · Catalogue · Envies · Commandes · Profil

### Logique d'AC-04 (Catalogue)

Vue mobile : grille 2 colonnes de produits.
Filtres en chip horizontaux : *Catégorie · Zone d'origine · Producteur · Disponibilité* (cette semaine / ce mois).

**Règle clé (H3)** : un produit n'apparaît dans le catalogue que si la condition suivante est vraie :
> Au moins un rameneur a effectué ≥ 2 trajets compatibles dans les 30 derniers jours, OU au moins un trajet compatible est actuellement déclaré.

→ ça évite que l'acheteur ajoute en wishlist un produit qui n'a aucune chance d'arriver. Pour les producteurs hors couverture rameneurs, leur catalogue n'est pas visible côté acheteur (mais le producteur peut quand même le saisir — il n'est juste pas indexé).

**État vide à prévoir** : *« On n'a pas encore de rameneurs réguliers sur ta zone. Inscris-toi à la liste d'attente, on te prévient. »*

### Logique d'AC-05 (Fiche produit)

Contenu :
- Photos (carrousel)
- Nom, prix, unité, catégorie
- Producteur (avatar, nom, zone, note moyenne, lien vers AC-08bis profil producteur public — **à ajouter au sitemap**)
- Disponibilité indicative : *« Habituellement disponible : printemps/été »*
- **Indicateur "Probabilité de match"** : *« Trajets fréquents depuis cette zone — match estimé sous 1 à 3 semaines »* OU *« Trajets rares — patience »*
- CTA principal : **« Ajouter à mes envies »**
- CTA secondaire : *« Voir le profil du producteur »*

Si déjà en wishlist, CTA devient *« Dans mes envies »* (état désactivé / icône cœur plein).

---

## Phase 2 — Wishlist

**Objectif acheteur** : exprimer ses envies sans s'engager financièrement.
**Objectif Delta** : agréger la demande pour générer des matches pertinents.

### Écran : AC-06 Mes envies

Liste verticale des envies, chacune avec :
- Photo + nom produit
- Producteur, zone d'origine
- Statut de match (3 états possibles, voir ci-dessous)
- Date d'ajout
- Action : **Retirer**

**Statuts d'une envie** :

| Statut | Affichage acheteur | Déclencheur |
|--------|-------------------|-------------|
| `pending` | *En attente d'un rameneur* | Ajout en wishlist, pas encore de trajet déclaré qui matche |
| `matchable` | *Match probable cette semaine* | Au moins un rameneur a déclaré un trajet compatible mais n'a pas encore réservé la mission |
| `matched` | *Confirmation requise — 23h restantes* | Un rameneur a réservé la mission, l'acheteur doit confirmer + payer |
| `confirmed` | (Sort de la wishlist, passe en commande, voir AC-08) | L'acheteur a confirmé et payé |

**Important** : l'acheteur peut retirer une envie à tout moment **sauf** quand elle est en `matched` (à ce stade, il doit soit confirmer soit refuser explicitement, voir Phase 3).

**Filtres tri** : Par statut · Par producteur · Par date d'ajout

---

## Phase 3 — Attente match → Confirmation

**Objectif acheteur** : être informé qu'un rameneur peut transporter, décider rapidement.
**Objectif Delta** : convertir le match en paiement avant que la fenêtre se ferme.

### Notification

Push + email + in-app (TR-02 centre notif). Format :

> 🚜 **Pierre peut vous ramener du miel jeudi**
> Confirmez avant demain 18h — 8,50 €
> [Voir détails]

### Écran : AC-07 Notification de match → confirmation

Contenu chronologique :

1. **Récap mission**
   - Produit (photo, nom, quantité, prix)
   - Producteur (nom, zone, note)
   - Rameneur (avatar, prénom, note, nombre de missions effectuées) — **donne confiance**
   - Date prévue de récupération chez producteur
   - Date prévue de livraison (estimation, ex *« jeudi 14 mai en soirée »*)
   - Lieu de livraison proposé : *« Près de chez vous — à confirmer dans le chat avec Pierre »*

2. **Récap financier transparent**
   ```
   Produit (miel 500g)        8,50 €
   ────────────────────────────────
   dont producteur (85%)      7,23 €
   dont rameneur (10%)        0,85 €
   dont Delta (5%)            0,42 €
   ```
   → renforce le pitch "rémunération juste"

3. **Compte à rebours** : *« Réservé pour vous jusqu'à demain 18h00 »*

4. **CTA principal** : **« Confirmer et payer 8,50 € »** → ouvre Stripe (modal ou redirect)
5. **CTA secondaire** : *« Refuser cette mission »* (avec confirmation ; libère le rameneur)

### Sous-écran AC-07b — Paiement Stripe

Stripe Payment Element intégré (carte / Apple Pay / Google Pay).
Une fois le paiement validé : transition immédiate vers AC-08 avec un toast *« C'est confirmé ! Pierre vient vous voir jeudi. »*

### Cas limites à gérer dans cet écran
- Acheteur ne répond pas dans les 24h → mission `awaiting_buyers` continue sans lui s'il y a d'autres acheteurs ; ou `cancelled_no_buyer` s'il était seul
- Plusieurs envies sont matchées simultanément par le même rameneur → AC-07 devient un récap groupé (1 paiement, plusieurs produits du même producteur ; multi-producteurs interdit en MVP donc cas rare)
- Refus explicite acheteur : envie revient à `pending`, l'acheteur peut la garder ou la retirer

---

## Phase 4 — Attente livraison

**Objectif acheteur** : suivre l'avancement, pouvoir contacter le rameneur si besoin.
**Objectif Delta** : limiter les inquiétudes ("où est mon miel ?") qui génèrent du support.

### Écran : AC-08 Mes commandes

Onglets : **À venir** · **En cours** · **Livrées**

Card d'une commande "En cours" :
- Photo produit + nom + producteur
- **Tracker visuel d'étapes** (4 étapes max, mini horizontal stepper) :
  1. Confirmé ✓
  2. Récupéré chez Pierre ✓
  3. En route 🚗 (étape active)
  4. À récupérer (à venir)
- Date estimée de livraison
- Boutons :
  - *« Chat avec Pierre »* (rameneur) — TR-03
  - *« Voir le QR de retrait »* (s'active uniquement à l'étape 4)

### Notifications passives à chaque transition d'état mission
- `confirmed` → `picked_up` : push *« Pierre a récupéré votre miel chez le producteur »*
- `picked_up` → `delivered` (étape acheteur courant) : push *« Pierre est près de chez vous, organisez la remise »*

### Sous-écran AC-08b — QR delivery

Plein écran, QR code centré, instructions :
> *« Présentez ce QR à Pierre quand vous le rencontrez. Il le scanne, c'est livré. »*

QR à usage unique. Une fois scanné, transition automatique vers écran de confirmation + invitation à noter (AC-10).

---

## Phase 5 — Réception et notation

**Objectif acheteur** : confirmer la bonne livraison, partager son expérience.
**Objectif Delta** : alimenter le système de réputation, débloquer le split paiement.

### Écran : AC-10 Évaluation post-livraison

Déclenché automatiquement après scan QR delivery réussi.
2 sous-formulaires successifs :

1. **Note du producteur** (Pierre Dupont, miel)
   - 5 étoiles
   - Commentaire optionnel (placeholder *« Qualité, conditionnement... »*)
2. **Note du rameneur** (Sophie M.)
   - 5 étoiles
   - Commentaire optionnel (placeholder *« Ponctualité, courtoisie... »*)
3. CTA *« Envoyer mes avis »* OU *« Passer pour le moment »* (rappels notifs après 48h, 7j ; après 14j on n'insiste plus)

### Écran : AC-09 Historique

Liste chronologique inversée des commandes livrées.
Par item : date · produit · producteur · rameneur · montant · facture PDF (lien)
Filtres : par producteur · par mois · par catégorie.

---

## Écrans transverses utilisés par l'acheteur

| Écran | Rôle dans le parcours acheteur |
|-------|-------------------------------|
| TR-01 Auth | AC-01 / AC-02 sont en réalité des entrées dans TR-01 + onboarding spécifique |
| TR-02 Notifications | Centre de regroupement des push (matches, transitions de statut, messages chat) |
| TR-03 Chat de mission | Conversation acheteur ↔ rameneur, ouvert dès `confirmed`, fermé 7j après `closed` |
| TR-04 Signalement | Accessible depuis AC-08 sur une commande problématique |

---

## Onboarding (AC-01 + AC-02 enchaînés)

Première fois sur Delta :

1. **Bienvenue** : pitch en 1 écran (visuel + 3 lignes)
2. **Création compte** : email + mot de passe OU sign-in Google/Apple
3. **Choix du rôle** : Acheteur / Rameneur / Producteur (radios visuelles)
4. **Onboarding acheteur (AC-02)** :
   - Code postal (autocomplétion API Adresse Gouv.fr)
   - Catégories d'intérêt (3-6 chips à toggle : *Miel, Légumes, Fromages secs, Charcuterie, Conserves, Boissons non alcoolisées...*)
   - *« On vous notifiera quand des produits qui vous intéressent peuvent arriver chez vous »*
5. **Permission notifications** (push) — bien vendre la promesse
6. → **Atterrissage AC-03** avec un onboarding tooltip : *« Pas encore d'envies ? Explore le catalogue. »*

---

## Compte et paramètres (AC-11)

Sections :
- **Profil** : nom, photo (optionnelle), email
- **Adresses** : adresses de livraison habituelles (≥ 1, max 3 en MVP). Chacune avec libellé (Maison / Bureau / Autre)
- **Préférences notifications** : toggle par type (Match trouvé / Statut commande / Messages / Newsletter)
- **Moyens de paiement** : cartes enregistrées via Stripe
- **Paramètres compte** : changer mot de passe / supprimer compte (RGPD) → vers TR-01
- **Aide & contact** : FAQ, signaler un problème → TR-04
- **À propos** : CGU, CGV, mentions, charte

---

## Décisions

### Tranchées le 2026-05-01

| # | Question | Décision |
|---|----------|----------|
| D1 | Wishlist : produit spécifique ou hybride ? | **Produit spécifique uniquement.** L'acheteur identifie un produit d'un producteur précis. Pas d'envie générique en MVP. |
| D3 | Lieu de livraison : adresse exacte vs point de RDV chat ? | **Point de RDV négocié dans le chat de mission.** Confirme la décision déjà actée dans `decisions_produit.md` (lieu flexible). L'adresse postale exacte de l'acheteur n'est pas exposée au rameneur — seulement la zone (code postal / quartier). |
| D4 | Prix dans la wishlist : actuel vs figé ? | **Prix actuel du producteur** (pas de figeage à l'ajout). Si le producteur ajuste son prix entre l'ajout en wishlist et le match, c'est ce nouveau prix qui sera proposé en AC-07. CGV à clarifier sur ce point. |
| D7 | Pénalité refus acheteur après match ? | **Pénalités crescendo.** Pas de pénalité au 1er refus, avertissement au 2e dans le mois, suspension temporaire à partir du 3e. Détail des seuils à finaliser avec décision dev. |

### Encore ouvertes (non bloquantes pour les maquettes)

| # | Question | Impact |
|---|----------|--------|
| D2 | Seuil exact pour considérer un produit "matchable" dans AC-04 (proposition : ≥2 trajets compatibles sur 30 jours OU ≥1 trajet actif) | Réglage produit, pas un changement d'écran |
| D5 | Nombre maximum d'envies actives par acheteur (proposition : 20) | Limite côté serveur, pas un changement d'écran |
| D6 | Plusieurs envies matchées simultanément par un même rameneur (même producteur) : 1 paiement groupé (proposé) ou N paiements séparés ? | 1 PaymentIntent groupé est plus simple côté Stripe et cohérent avec "1 mission = 1 producteur" |

---

## Écrans à ajouter au sitemap (proposition)

Le sitemap actuel liste 11 écrans acheteur. Ce parcours en suggère 2 nouveaux + 1 sous-écran :

| ID proposé | Écran | Justification |
|-----------|-------|---------------|
| **AC-08bis** | Profil public producteur (vue acheteur) | Permet à l'acheteur de cliquer sur "le miel de Pierre" et voir qui est Pierre. Existe déjà côté producteur (PR-08), juste à exposer côté acheteur. |
| **AC-12** | Liste d'attente / zone non couverte | État vide d'AC-04 quand aucun rameneur ne couvre la zone. Permet de capturer la demande latente avant que les rameneurs viennent. |
| **AC-07b** | Paiement Stripe (modal ou écran) | Sous-étape de AC-07 mais mérite d'être tracé pour le QA |
| **AC-08b** | Plein écran QR delivery | Sous-étape de AC-08, idem |

---

## Prochaines étapes

1. Validation par Julien des hypothèses H1, H2, H3 et des décisions ouvertes D1-D7
2. Mise à jour du sitemap (ajout AC-08bis, AC-12, sous-écrans AC-07b et AC-08b)
3. Choix des 3-4 premiers écrans à maquetter (proposition : AC-03 Accueil, AC-05 Fiche produit, AC-07 Notification de match, AC-08 Mes commandes)
4. Production des maquettes HTML mobile + responsive desktop dans `design/maquettes/acheteur/`
