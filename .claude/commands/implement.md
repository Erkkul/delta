Implémente le ticket Jira KAN-XX (passé en argument ou présent dans le
nom de la branche `kan-XX-<slug>`) en suivant les specs dans
specs/KAN-XX/.

## Contexte à charger
- specs/KAN-XX/proposal.md — pourquoi, périmètre, hypothèses
- specs/KAN-XX/design.md — architecture, packages touchés, modèle de
  données, endpoints, tests
- specs/KAN-XX/tasks.md — tâches techniques internes à cocher au fur et
  à mesure
- ARCHITECTURE.md §3 (structure monorepo), §14 (playbook ajout feature),
  + les sections citées dans design.md
- DESIGN.md pour tout ce qui touche à l'UI
- CLAUDE.md pour les workflows obligatoires et garde-fous produit

## Workflow d'implémentation
1. Vérifier que toutes les dépendances listées dans design.md § Dépendances
   sont marquées "Fait" dans tech/setup.md. Si non, t'arrêter et signaler.
2. Implémenter feature par feature, en respectant ARCHITECTURE.md §14.2
   (table de placement du code).
3. Cocher les tâches de tasks.md au fur et à mesure (commits ciblés).
4. Lancer `pnpm lint && pnpm typecheck && pnpm test` après chaque commit
   non trivial.
5. Si tu introduis une décision technique structurante (changement de
   stack, dérogation à une règle ARCHITECTURE.md), ajouter une entrée au
   journal §18 d'ARCHITECTURE.md dans le même commit que le code
   concerné.
6. À la fin : ouvrir une PR via gh, description listant les subtasks Jira
   couvertes et les tâches tasks.md cochées.

## Conventions
- Format de commit : `[KAN-XX] verbe + objet`. Pas de préfixe
  conventionnel (`feat:`, `chore:`).
- Branche : `kan-XX-<slug>`.
- Aucune duplication de contenu entre Jira / repo (Jira ne stocke que
  des liens vers specs/KAN-XX/).

## Garde-fous
- Ne pas dévier des garde-fous produit de CLAUDE.md (rameneur initiateur,
  scope MVP, escrow Stripe, pas de produits frais, etc.).
- Si tu rencontres une contradiction entre la spec et une décision
  CLAUDE.md, s'arrêter et signaler — ne pas trancher.
- Si une dépendance manquante ou une ambiguïté spec bloque le travail,
  s'arrêter et signaler.
