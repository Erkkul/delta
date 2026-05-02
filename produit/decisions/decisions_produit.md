# Journal des décisions produit — Delta

**Version** : v1 — 2026-05-01

Ce document trace les arbitrages produit pris au fur et à mesure des itérations. Il sert de mémoire vive : permet de retrouver pourquoi un choix a été fait et ce qui a été écarté.

---

## Décisions validées

### Naming

- **2026-05-01** — Le nom de code du projet reste *Delta*. Le naming définitif (« Les Fourmis » envisagé dans une maquette précédente) sera tranché plus tard.

### Modèle d'expérience

- **2026-05-01** — Inversion du modèle vs. PRD initial. Le **rameneur est proactif** : il déclare son trajet, voit les opportunités combinées (producteurs + voisins demandeurs), et déclenche la mission. Le système ne pousse plus de matching automatique commande → rameneur.
- **2026-05-01** — Wishlist acheteur **privée** en v1. Pas de carte publique de la demande, le matching se fait côté serveur.
- **2026-05-01** — Réservation de mission **exclusive** : premier rameneur qui clique verrouille, plus accessible aux autres. Pas d'enchère ni de file d'attente.
- **2026-05-01** — Une mission = **un producteur** au MVP. Un rameneur peut chaîner plusieurs missions sur un même trajet, mais elles restent atomiques.
- **2026-05-01** — Capacité véhicule déclarée qualitativement par le rameneur : **sac / coffre / break**. Pas de poids ou volume précis en MVP.
- **2026-05-01** — Déclaration de trajet : **dates uniquement** au MVP, pas d'heure de départ ni de retour. Simplifie le formulaire. Heures envisagées en v2 si pertinence du matching le justifie.
- **2026-05-01** — Saisie ville/code postal : **autocomplétion** via API Adresse Gouv.fr (gratuite). Note d'implémentation, transparent pour les maquettes.

### Design & responsive

- **2026-05-02** — **Abandon du mobile-first**. La plateforme doit être accessible sur tous les devices (desktop + mobile) pour tous les personas (rameneur, acheteur, producteur). Toute maquette est conçue avec les deux déclinaisons simultanément. Pas de hiérarchie mobile vs. desktop. Cette décision supersede l'hypothèse mobile-first initiale du PRD et retire la "Web app acheteur" de la liste hors scope MVP.
- **2026-05-02** — **Abandon de la restriction géographique Normandie ↔ Paris**. Delta est ouvert sur tous les axes ruraux-urbains nationaux dès le MVP. Pas de territoire pilote unique. Le choix du premier axe d'activation est une décision opérationnelle, non une contrainte produit. Tous les documents produit sont mis à jour en conséquence ; l'étude de marché initiale (axe Normandie-Paris) est conservée en archives comme données de référence illustratives.

### Parcours producteur

- **2026-05-01** — Layout producteur : **sidebar nav gauche persistante** (Tableau de bord, Catalogue, Récupérations, Ventes, Profil, Paramètres). Pattern back-office classique justifié par usage long et récurrent. Rupture visuelle assumée vs header simple côté rameneur.
- **2026-05-01** — Producteur **responsive partout**, mais **PR-06 (récupération QR) pensé mobile-first** car usage terrain (à la ferme avec téléphone, scan caméra).
- **2026-05-01** — Catalogue produits : **grille de cartes avec photo** (et non table dense). Adapté à un volume MVP de moins de 20 références par producteur. Vue table en option à considérer post-MVP si demandée.
- **2026-05-01** — Photos produit : **1 à 4 photos**, la première étant la couverture. Drag-and-drop pour réordonner. Format paysage privilégié.
- **2026-05-01** — Trois statuts produit au MVP : **Actif** (visible voisins), **Brouillon** (vous seul), **Désactivé** (masqué temporairement). Le statut **Épuisé** est un dérivé automatique du champ stock, pas un statut manuel.
- **2026-05-01** — Stock produit : champ obligatoire avec **seuil d'alerte configurable** (notification quand stock ≤ seuil). Pas de gestion fine multi-emplacements en MVP.
- **2026-05-01** — Édition produit : **toggle « prix tout compris voisin »** activé par défaut. Le producteur fixe son prix net (8,50 €) et l'app montre transparent au voisin le prix final (10,00 € incluant commissions). Cohérent avec le principe de transparence du PRD.
- **2026-05-01** — Édition produit : **labels bio / qualité optionnels** au MVP (Bio AB, Demeter, Nature & Progrès, Label Rouge, Aucun). Pas de vérification des labels en MVP — déclaratif.
- **2026-05-01** — PR-06 récupération : interface en **3 états** — liste des récupérations à venir / scan QR actif / remise confirmée. Pas de vue agrégée multi-pickups simultanés (un rameneur à la fois).
- **2026-05-01** — Récupération QR : **checklist produit obligatoire** avant validation finale. Le producteur coche chaque item au fur et à mesure qu'il met en carton, le bouton « Confirmer la remise » reste désactivé tant que tout n'est pas coché. Évite les erreurs de remise.

### Paiement et logistique

- **2026-05-01** — Modèle paiement : **Option B (escrow Stripe)**. L'acheteur paie intégralement à la confirmation de mission, fonds gardés en escrow, libérés à la livraison.
- **2026-05-01** — Mécanique de remise : **Option 3 (QR codes)**. Un QR pour le pickup chez le producteur, un QR pour chaque delivery acheteur. Aucun cash ne circule.
- **2026-05-01** — Lieu de remise final **flexible** : accord direct entre rameneur et acheteur via chat (domicile, point de RDV, café, etc.). Pas de protocole imposé.
- **2026-05-01** — Répartition financière confirmée : **85 % producteur / 10 % rameneur / 5 % plateforme**.

### Parcours acheteur

- **2026-05-01** — **Wishlist = produit spécifique uniquement** au MVP. L'acheteur identifie un produit précis d'un producteur précis (pas d'envie générique type *« je veux du miel »*). Cohérent avec un catalogue parcourable. Réversibilité possible v2 via mode hybride. (Décision D1 du `parcours_acheteur.md`)
- **2026-05-01** — **Catalogue acheteur (AC-04) filtré aux produits matchables** uniquement. Un produit n'apparaît que si au moins un rameneur a fait des trajets compatibles récents (seuil exact à régler côté dev, proposition ≥ 2 trajets sur 30 j ou ≥ 1 trajet actif). Évite la déception "j'ai mis ça en wishlist depuis 6 mois". Producteurs hors couverture rameneurs restent invisibles tant que la demande n'attire pas un rameneur.
- **2026-05-01** — **Adresse postale exacte de l'acheteur non exposée au rameneur**. Seule la zone (code postal / quartier) est partagée avant confirmation. Le point de RDV final est négocié dans le chat de mission. Confirme et précise la décision "lieu de remise flexible". (Décision D3)
- **2026-05-01** — **Prix wishlist non figé** : c'est le prix actuel du producteur qui s'applique au moment du match (AC-07), pas celui affiché à l'ajout en wishlist. À documenter dans CGV pour éviter litige. (Décision D4)
- **2026-05-01** — **Pénalités acheteur crescendo en cas de refus après match** : pas de pénalité au 1er refus, avertissement au 2e dans un mois glissant, suspension temporaire à partir du 3e. Évite l'usage abusif (réservation "pour voir" qui bloque les rameneurs). Seuils précis à finaliser. (Décision D7)
- **2026-05-01** — **Profil public producteur exposé côté acheteur** (nouvel écran AC-08bis ajouté au sitemap). Permet à l'acheteur de comprendre qui est le producteur depuis la fiche produit, principe de confiance.
- **2026-05-01** — **État "zone non couverte" matérialisé** comme écran à part entière (AC-12). Quand aucun rameneur ne couvre la zone, l'acheteur s'inscrit sur une liste d'attente. Capture la demande latente avant l'acquisition rameneurs.

---

## Décisions écartées

| Décision écartée | Raison |
|------------------|--------|
| Matching automatique algorithmique commande → rameneur | Trop complexe pour MVP, ne reflète pas la dynamique réelle d'usage rameneur (proactif et non réactif) |
| Wishlist publique avec carte de la demande | Hors MVP — risque RGPD et complexité UI. À reconsidérer en v2. |
| Paiement à la livraison en cash | Plateforme ne touche pas sa commission, aucune traçabilité, hors conformité Stripe Connect |
| Multi-producteurs par mission | Complexifie la logistique QR et la perception rameneur. Repoussé à v2. |
| Carte interactive temps réel des trajets | Hors MVP — luxe UX vs. priorité fonctionnelle |

---

## Décisions à prendre (en suspens)

### Bloquantes pour démarrage des maquettes

Aucune. On peut commencer les maquettes du parcours rameneur (RM-04, RM-05, RM-06).

### Bloquantes pour développement

- Seuil minimum (acheteurs ou montant) pour qu'une mission soit confirmée
- Délai de confirmation acheteur après notification de match (proposé : 24 h)
- Politique de compensation rameneur en cas de rupture stock producteur
- Règles no-show acheteur (durée de grâce, sort du produit non récupéré)
- Politique de pénalités (suspension après X abandons rameneur ou X ruptures producteur)

### Non bloquantes mais à clore avant lancement pilote

- Naming définitif du projet
- Identité graphique finale (logo, palette validée)
- Périmètre exact des produits autorisés au MVP (liste précise vs. catégories)
- Contenu CGU/CGV
- Statut juridique du rameneur côté URSSAF (auto-entrepreneur recommandé au-delà d'un seuil)

---

## Méthode

Ce journal est mis à jour à chaque itération. Chaque entrée mentionne la **date** de la décision et idéalement le **contexte** ou la **raison**. Les décisions écartées sont conservées pour ne pas y revenir sans nouvelle information.
