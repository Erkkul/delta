# Notes d'implémentation — KAN-31

Conflits maquette / DESIGN.md et déviations assumées, cf. CLAUDE.md §
« Avant d'écrire ou modifier une UI » (en cas de conflit : appliquer la
maquette ET signaler ici pour arbitrage — ne pas trancher seul).

## Couleurs `gold` / `rose` absentes de DESIGN.md

`design/maquettes/acheteur/ac-07-notification-match.html` définit deux
couleurs (`--gold: #D4A017`, `--rose: #C75B5B`) qui n'existent dans aucun
token de `DESIGN.md` ni dans `apps/web/tailwind.config.ts` (palettes
`green` / `earth` / `cream` uniquement). Utilisées dans la maquette pour
l'icône étoile de notation et l'état hover du lien "Refuser".

Décision prise ici : la maquette n'a finalement pas de notation affichée
côté implémentation (cf. section suivante), donc `gold` n'est pas
consommé. `rose` (`#C75B5B`) est repris en valeur arbitraire Tailwind
(`text-[#C75B5B]`) pour le message d'erreur et le hover du bouton
"Refuser" — à arbitrer : soit ajouter `rose` aux tokens `DESIGN.md` /
`tailwind.config.ts` si l'usage se généralise (messages d'erreur,
actions destructives), soit réutiliser un token existant.

## Notation producteur/rameneur non affichée

La maquette montre "4.9 · 47 missions" sous chaque acteur (producteur et
rameneur). Aucune donnée de notation n'existe en base (épic Notations,
ex-KAN-52/53, non livré) — cohérent avec la posture "aucune donnée
mockée" déjà appliquée sur KAN-28 (catalogue) et KAN-30 (wishlist).
Déviation assumée : la ligne de notation est omise de l'implémentation
plutôt que fabriquée. À réintroduire quand KAN-52/53 (ou équivalent)
existera.

## CTA "Confirmer et payer" — scission confirmation / paiement

Le bouton de la maquette est unique ("Confirmer et payer {prix}") et son
libellé est repris tel quel. Côté implémentation, il n'appelle QUE
`POST /api/v1/buyer/mission-matches/[id]/confirm` (transition du match +
décrément stock) — aucun paiement Stripe n'est déclenché, le paiement
restant hors périmètre de KAN-31 (cf. specs/KAN-31/proposal.md §
Hypothèses, ex-KAN-33/34 supprimés de Jira). Le libellé du bouton anticipe
donc une étape de paiement qui n'existe pas encore techniquement — à
corriger (texte ou flow) quand le domaine paiement sera implémenté.
