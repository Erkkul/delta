# Cadrage — KAN-23 Statuts produit

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-23
- Epic : KAN-5 Catalogue
- Maquettes :
  - `design/maquettes/producteur/pr-04-catalogue.html` (tabs filtres `Tous / Actifs / Brouillons / Désactivés`, badges `actif / brouillon / epuise / desactive`, menu kebab `product-menu-btn`)
  - `design/maquettes/producteur/pr-05-edition-produit.html` (section 5 « Visibilité » — tri-état radios)
- PRD : §10.2 PR-04 Catalogue produits, §10.2 PR-05 Création / édition produit
- ARCHITECTURE : §3 (monorepo), §4.3 (erreurs typées), §10 (tests), §14 (playbook), §18 entrée 1.22 (table `products` posée par KAN-20)

## Pourquoi (côté tech)

KAN-20 a posé l'enum `product_status` (`active` / `draft` / `disabled`) et un radio tri-état dans le formulaire PR-05, mais **sans préconditions de transition** : un producteur peut publier (`status = 'active'`) un produit sans description, sans photo, avec un stock à 0. KAN-22 a ajouté le statut dérivé `Épuisé` (`stock = 0 && status = 'active'`) à l'affichage de la card via le helper `getStockDisplayState`, mais sans tab de filtre dédié dans la liste.

KAN-23 ferme la boucle : (a) règles de transition appliquées côté core avec erreurs typées par précondition manquante (subtask KAN-76), (b) tab « Épuisés » ajouté aux filtres avec décompte serveur (subtask KAN-77), (c) menu kebab `product-menu-btn` câblé pour les quick actions de transition depuis la card du catalogue. Aucune migration DB, aucun event Inngest.

## Périmètre technique

**In scope :**

- Nouveau use case `transitionProductStatus(productId, targetStatus, ownerUserId)` dans `packages/core/src/product/` : valide la transition (graphe `draft ↔ active ↔ disabled` + `draft → disabled`), applique les préconditions de publication, retourne le snapshot mis à jour. Erreurs typées dédiées (cf. design.md).
- Préconditions de publication (`draft → active` et `disabled → active`) : `name` non vide, `description` non null et non vide, `unit_price_cents > 0` (déjà CHECK DB), `stock > 0`, `photos` non vide (`jsonb_array_length ≥ 1`), `availability_to` non échue (si renseignée).
- Nouveau endpoint `POST /api/v1/producer/products/[id]/status` body `{ status: 'active' | 'draft' | 'disabled' }`. Sémantique d'action séparée du `PATCH` CRUD pour avoir des erreurs typées propres et un point d'instrumentation futur.
- Filtre serveur « Épuisés » : query param `status='sold_out'` côté `GET /api/v1/producer/products` se traduit par `WHERE status = 'active' AND stock = 0 AND deleted_at IS NULL`. Décompte serveur dans la response (`{ items, nextCursor, counts: { all, active, draft, disabled, sold_out } }`).
- UI catalogue PR-04 :
  - Tab « Épuisés » ajouté à `<CatalogueFilters />` avec compteur.
  - Menu kebab `product-menu-btn` câblé : actions « Activer », « Mettre en brouillon », « Désactiver » selon le statut courant + « Supprimer » (déjà câblée par KAN-20). Toast succès / erreur. Re-fetch de la liste après transition.
  - Si la transition échoue pour précondition manquante (ex : pas de photo) → toast d'erreur + lien « Compléter la fiche » qui ouvre la page d'édition avec un message inline.
- UI formulaire PR-05 :
  - Section 5 « Visibilité » : message inline sous le radio `Actif` listant les préconditions manquantes, désactive le bouton « Enregistrer » uniquement quand l'utilisateur tente de passer en `Actif` avec préconditions non remplies (autres statuts toujours enregistrables).
  - À la soumission `PATCH` avec `status = 'active'` qui échoue côté API, afficher l'erreur typée mappée à un message localisé.
- Mise à jour du commentaire de tête du `<ProductCard />` et du `getStockDisplayState` : pas de changement de logique mais documentation que `sold_out` peut désormais arriver comme valeur de filtre `?status=`.

**Out of scope (cette US) :**

- **Migration DB** : aucune. L'enum reste `active | draft | disabled`. `sold_out` est purement dérivé à l'affichage et au filtrage (cf. décision KAN-22 confirmée).
- **Gating catalogue acheteur sur stock = 0** : reste KAN-28. La RLS `products_select_public` n'est pas touchée — un produit `active, stock = 0` reste visible à l'acheteur tant que KAN-28 ne décide pas du masquage / wishlist.
- **Notifications de transition** (« votre produit a été publié », « stock épuisé ») : reste KAN-56. Pas d'event Inngest émis ici.
- **Auditabilité / table `product_events`** : pas de table d'événements produit au MVP. La traçabilité des transitions est différée à un éventuel module modération (KAN-59) ou à une décision post-MVP.
- **Modération admin** (forcer `disabled` côté back-office) : KAN-59.
- **Auto-désactivation par jobs** (ex : fenêtre `availability_to` dépassée → bascule `active → disabled`) : différé post-MVP. Au MVP, un produit hors fenêtre est filtré par la RLS publique mais reste `active` côté producteur (lui reste responsable de basculer manuellement).
- **Workflow équivalent côté mission / offre** : autre épic.
- **Mobile** : non livré (cohérent KAN-20/21/22).

## Hypothèses

- **Graphe de transitions retenu** : `draft ↔ active`, `active ↔ disabled`, `draft → disabled`, `disabled → draft`. Tous les chemins sont autorisés ; seules les transitions **vers `active`** ont des préconditions. La décision est libérale côté retour en `draft` (un producteur peut toujours dépublier un produit). À arbitrer si on souhaite verrouiller `disabled → draft` (peu probable utile).
- **Description requise pour publication** : on exige `description` non null **et** non vide après trim. Pas de longueur minimum imposée — la maquette PR-05 n'en fixe pas, et imposer un seuil arbitraire (ex : 20 chars) ajouterait une friction sans gain produit clair. À pointer en review si désaccord.
- **Stock requis pour publication** : `stock > 0`. On refuse de publier un produit dont le badge serait immédiatement « Épuisé » à la première lecture — l'expérience producteur le veut. Conséquence : si le stock tombe à 0 après publication, le produit **reste** `active` (badge dérivé `Épuisé` côté UI, RLS publique inchangée). Cohérent avec KAN-22.
- **Photos requises pour publication** : au moins 1 photo (KAN-21 livré). Cohérent avec le ton de la note pédagogique du panneau preview PR-05 (« Ajoutez une photo pour la confiance »).
- **Endpoint dédié `…/status`** plutôt qu'un `PATCH` champ unique : un endpoint d'action expose une erreur métier claire (`PRODUCT_PUBLISH_MISSING_PHOTOS`), tandis qu'un `PATCH` générique renvoie un `VALIDATION_ERROR` global. Sans surcoût significatif (le handler reste 15-30 lignes).
- **Pas de validation côté `PATCH /[id]`** sur le champ `status` : le `PATCH` accepte toujours `status` en input (cohérent avec ce qui est livré KAN-20), mais le serveur **route en interne** l'update via le use case `transitionProductStatus` si le statut change. Évite la divergence entre les deux chemins d'API. À discuter — alternative : interdire `status` dans le `PATCH` et forcer le client à passer par `…/status` (plus strict, casse possible avec le formulaire existant).
- **Filtre serveur `sold_out`** : implémenté comme une **valeur additionnelle** du query param `status` (`?status=sold_out`) plutôt qu'un nouveau param dédié. Cohérent avec l'enum dérivé. Côté Zod : `status: z.enum(['all','active','draft','disabled','sold_out']).optional()`.
- **Décompte serveur des tabs** : retourné dans la réponse `GET /producer/products` pour éviter 5 requêtes parallèles. Comptés sur `WHERE producer_user_id = auth.uid() AND deleted_at IS NULL` puis groupés par `status` + un `sold_out` calculé.
- **Contradiction documentée avec KAN-22** : KAN-22 avait écrit « Pas de nouveau tab de filtre Épuisés ». KAN-23 introduit ce tab car le subtask Jira KAN-77 le demande explicitement (« Actif / Brouillon / Désactivé / Épuisé »). À mentionner dans le `tasks.md` et le journal §18 d'ARCHITECTURE.md si jugé structurant.
- **Quick actions card** : trois actions max visibles dans le menu kebab selon le statut courant (ex : si `active` → « Mettre en brouillon » + « Désactiver » + « Supprimer »). Évite la cacophonie de 4 actions toujours visibles.
