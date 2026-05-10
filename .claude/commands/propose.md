---
description: Cadrage technique d'un ticket Jira KAN (génère proposal/design/tasks)
argument-hint: KAN-XXX
---

Active le skill `propose-spec` pour cadrer techniquement le ticket Jira `$ARGUMENTS`.

Suivre la procédure du skill dans son intégralité :

1. Fetch le ticket et le contexte (mapping Jira ↔ écran, maquette, sections PRD et ARCHITECTURE pertinentes)
2. Vérifier l'idempotence (le dossier `specs/$ARGUMENTS/` existe-t-il déjà ?)
3. Générer les trois specs en mémoire à partir des templates
4. Présenter le brouillon en chat et attendre une validation explicite
5. Après validation : écrire les fichiers, mettre à jour Jira (commentaire + section description + transition vers To Do), mettre à jour `produit/jira_mapping.md`, et commit `[$ARGUMENTS] ouverture cadrage`
