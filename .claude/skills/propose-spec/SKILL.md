---
name: propose-spec
description: Cadrage technique d'une feature Jira KAN du projet Delta. Génère trois specs courtes (proposal.md, design.md, tasks.md) à partir d'un ticket, met à jour Jira (commentaire + lien + transition To Do) et synchronise produit/jira_mapping.md. Déclenche dès que l'utilisateur tape /propose KAN-XXX, demande à "cadrer", "framer", "spécifier" ou "préparer techniquement" un ticket KAN, veut traduire une feature produit en brief technique, ou cherche à passer du produit à la tech avant d'attaquer le dev. Active aussi sur "écris les specs tech de KAN-XX", "génère le cadrage de KAN-XX", "prépare KAN-XX pour le dev". Toute demande de cadrage technique sur un ticket KAN doit déclencher ce skill, même si le mot "spec" n'est pas prononcé.
---

# propose-spec — Cadrage technique d'une feature Jira KAN

Ce skill produit le cadrage technique d'une feature Jira (projet KAN, Delta) sous forme de trois fichiers Markdown courts dans `specs/KAN-XXX/`, et synchronise Jira + le mapping repo. Il s'intercale entre le produit (PRD, décisions, mapping) et le code, sans dupliquer ni l'un ni l'autre.

## Quand l'utiliser

- Slash command `/propose KAN-XXX`
- L'utilisateur demande à cadrer / framer / spécifier / préparer techniquement un ticket KAN
- L'utilisateur veut écrire les specs tech avant d'attaquer le dev

## Pourquoi ce skill existe

Delta a déjà une couche produit solide (PRD, décisions, mapping Jira ↔ écrans) et une couche technique de référence (ARCHITECTURE.md). Entre "ticket en backlog" et "code commence", il manque un cadrage technique court qui formalise le périmètre, l'approche, et les tâches techniques internes (setup, refacto, migration) qui n'ont pas vocation à exister dans Jira.

Trois fichiers, pas plus. Un dossier par ticket. Pas de duplication du contenu Jira, PRD ou ARCHITECTURE — uniquement des liens.

## Workflow

### 1. Récupérer le contexte

- Extraire l'ID `KAN-XXX` de l'input. Si absent ou ambigu, demander.
- Fetch le ticket via le MCP Atlassian (`getJiraIssue`, cloudId `d565fb1d-ed2d-4f32-98c8-20be92dd45fb`). Récupérer summary, status, description, parent (epic), subtasks.
- Lire `produit/jira_mapping.md` pour trouver l'écran PRD associé, la maquette HTML si elle existe, les tickets liés.
- Identifier la section PRD §10.X correspondante via le mapping.
- Lire `ARCHITECTURE.md` §14 (playbook ajout feature) pour la checklist standard.
- Repérer les sections ARCHITECTURE.md utiles selon le ticket : §3 (monorepo), §5 (DB + RLS), §6 (state machine mission), §7 (matching), §8 (Stripe), §10 (tests). Charger uniquement les sections pertinentes — pas tout le fichier.
- Lire `tech/setup.md` pour identifier les services externes pertinents et leur statut de provisionnement. La section § Dépendances de `design.md` doit pointer vers les lignes correspondantes (jamais dupliquer le statut — `tech/setup.md` est la source unique de vérité).

### 2. Vérifier l'idempotence

Si `specs/KAN-XXX/` existe déjà :

- Afficher l'existant
- Proposer : (a) consulter, (b) régénérer après confirmation explicite (overwrite), (c) éditer une section précise
- Défaut = (a). Ne jamais écraser sans confirmation.

### 3. Générer les trois fichiers en mémoire

Charger les templates depuis `.claude/skills/propose-spec/templates/`. Substituer les variables :

- `{{KAN_ID}}` — ex `KAN-2`
- `{{TITLE}}` — summary Jira
- `{{JIRA_URL}}` — `https://erkulaws.atlassian.net/browse/KAN-XXX`
- `{{EPIC}}` — clé + nom de l'epic parent (vide si non applicable)
- `{{MAQUETTE_PATH}}` — chemin relatif depuis la racine repo, ou `(non disponible)`
- `{{PRD_SECTION}}` — section PRD §10.X, ou autre référence pertinente
- `{{ARCHI_SECTIONS}}` — sections ARCHITECTURE.md jugées pertinentes (ex : `§5 (DB), §6 (state machine), §8 (Stripe)`). Si rien de spécifique, valeur par défaut `§14 (playbook général)`.
- `{{DESCRIPTION_BRIEF}}` — résumé court de la description Jira, ou `(à préciser — voir maquette et PRD)`
- `{{SUBTASKS_LIST}}` — liste à puces des subtasks Jira (clé + résumé), ou `(aucune)`

Pré-remplir les sections évidentes (liens, références) ; laisser les sections de fond (périmètre, modèle de données, risques) en placeholder explicite `(à préciser)`. Le cadrage est un brouillon que l'humain affine, pas une livraison finale.

### 4. Présenter le brouillon en chat

Afficher les trois fichiers en blocs Markdown distincts. Demander une validation explicite (`ok`, `valide`, ou `corrige X puis valide`). N'écrire aucun fichier tant que la validation n'est pas obtenue. Si l'utilisateur demande des corrections, les appliquer en mémoire et redemander.

### 5. Après validation : écrire et synchroniser

Dans cet ordre exact :

1. Créer `specs/KAN-XXX/` à la racine du repo Delta
2. Écrire les trois fichiers
3. Mettre à jour Jira :
   - **Commentaire** : `Cadrage technique disponible : specs/KAN-XXX/proposal.md, design.md, tasks.md`
   - **Description** : ajouter en bas une section `## Cadrage technique` listant les trois chemins (Markdown). Ne **jamais** copier le contenu des specs dans Jira — uniquement les liens. Source de vérité = repo.
4. Transitionner le ticket vers `To Do` :
   - `getTransitionsForJiraIssue` pour récupérer les transitions disponibles
   - Si une transition vers le statut `To Do` (ou son équivalent dans le workflow KAN) existe, l'appliquer
   - Si le ticket est déjà à un statut plus avancé (`In Progress`, `Done`, etc.), ne rien faire et le signaler en chat
5. Mettre à jour `produit/jira_mapping.md` :
   - Localiser le ticket dans les tables de parcours (Producteur / Acheteur / Rameneur / Transverse)
   - Ajouter ou mettre à jour une mention `[Cadrage tech](specs/KAN-XXX/)` dans la cellule du ticket
   - Si le ticket est transverse (apparaît dans plusieurs tables), mettre à jour partout
6. Commit Git unique : `[KAN-XXX] ouverture cadrage`

## Règles strictes

**Source unique de vérité.** Chaque info vit à un seul endroit. Le fond des specs est dans `specs/KAN-XXX/`. Jira et le mapping pointent — ils ne dupliquent pas.

**Pas de duplication des subtasks Jira dans `tasks.md`.** Les subtasks sont rappelées en commentaire en tête de `tasks.md` (pour mémoire, pour ne pas les redoubler). Le corps liste uniquement les tâches techniques *internes* invisibles côté produit : setup lib, migration DB, helpers, refacto, seeds, configuration.

**Pas de slug dans le nom du dossier.** C'est `specs/KAN-XXX/`, point. Pas de `specs/KAN-XXX-creation-compte/`.

**Pas d'écriture sans validation explicite** (étape 4 obligatoire).

**Idempotent.** Si le dossier existe, ne jamais écraser sans confirmation.

**Format de commit Delta.** `[KAN-XXX] ouverture cadrage`. Pas de préfixe conventionnel (`feat:`, `chore:`).

## Décisions techniques structurantes

Si le cadrage révèle une décision structurante (changement de stack, nouvelle convention, dérogation à une règle ARCHITECTURE.md), proposer à l'utilisateur d'ajouter une entrée au journal §18 d'ARCHITECTURE.md dans le même commit que l'ouverture du cadrage. Sinon, ne pas y toucher — la plupart des cadrages n'introduisent pas de décision structurante, juste de l'application de l'existant.

## Cas limites

- **Ticket inexistant** : signaler, ne rien créer.
- **Ticket sans description Jira** : utiliser `(à préciser — voir maquette + PRD)` comme `{{DESCRIPTION_BRIEF}}`. Le cadrage devient un brouillon à compléter.
- **Pas de maquette** : `(non disponible)`. Le signaler en fin de chat si l'écran devrait en avoir une.
- **Ticket transverse** : mettre à jour toutes les tables concernées du mapping.
- **Statut non transitionable vers To Do** : ne pas tenter, signaler le statut courant. Le reste du workflow (fichiers, mapping, commit) reste fait.

## Templates

Disponibles dans `.claude/skills/propose-spec/templates/` :

- `proposal.md`
- `design.md`
- `tasks.md`
