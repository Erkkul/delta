# Cadrage — KAN-27 Historique commandes

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-27
- Epic : KAN-6 Profil Acheteur
- Maquette : design/maquettes/acheteur/ac-09-historique.html
- PRD : §10.3 AC-09
- ARCHITECTURE : §5 (DB lecture / RLS), §8 (Stripe — montants / factures, déféré), §14 (playbook)

## Pourquoi (côté tech)

L'écran AC-09 « Historique » liste les commandes **livrées** d'un acheteur :
date, produit, producteur, rameneur, montant, note attribuée, facture PDF, et
actions « recommander ». Côté produit c'est la mémoire d'achat de l'acheteur ;
côté tech, aucune des tables qui l'alimentent n'existe encore au MVP — pas de
`missions`, pas de `mission_buyers`, pas de commande payée ni livrée à ce jour
(le parcours paiement KAN-33/34 et le cycle mission KAN-10/11 ne sont pas
développés). KAN-27 livre donc **l'enveloppe** (route autonome gatée, sections,
composants, navigation interne) en **empty state**, qui se câblera
incrémentalement quand les tables arriveront. Exactement la même approche que
KAN-19 (historique ventes producteur) et cohérente avec `/acheteur/profil`
(KAN-25), page acheteur autonome livrée avant le shell complet (KAN-28).

## Périmètre technique

**In scope :**

- Route autonome `/acheteur/historique` (Server Component) avec gating session +
  rôle `acheteur` calqué sur `/acheteur/profil` (KAN-25)
- Header `<h1>Historique</h1>` + sous-titre « Toutes vos commandes livrées ·
  factures téléchargeables »
- 3 stat cards (Commandes, Total dépensé, Km évités) rendues en empty state
  (valeur `—` / « Disponible bientôt »), pas de chiffres mockés
- Rangée de filtres (période / producteur / catégorie + « Exporter CSV »)
  rendue en `aria-disabled` + tooltip neutre tant qu'aucune commande
- Section liste : `<EmptyState />` (« Aucune commande pour l'instant. Vos
  commandes livrées apparaîtront ici. ») — pas de month-dividers ni d'order-cards
  au MVP
- Structure de composants (`<HistoryStats />`, `<HistoryFilters />`,
  `<HistoryList />`, futur `<OrderCard />`) prête à se câbler

**Out of scope (cette US) :**

- Lecture des commandes réelles (`missions` / `mission_buyers` / `products` /
  `users` inexistantes)
- Téléchargement de facture PDF — bouton « Facture » de la maquette (subtask
  KAN-86) couvert fonctionnellement par **KAN-36** ; aucune ligne au MVP donc
  aucun bouton rendu
- Action « Recommander » (re-déclenche un parcours d'achat → dépend de
  KAN-28/30/33), export CSV réel, filtres opérationnels
- Calcul des « km évités » (nécessite trajets KAN-10) et des agrégats dépensés
  (nécessite paiements KAN-33/34)
- Version mobile native (Expo) — web d'abord, cohérent KAN-25/26
- Shell acheteur complet (layout + nav globale + accueil AC-03) → KAN-28

## Hypothèses

- L'acheteur arrive sur `/acheteur/historique` par URL directe au MVP ; le lien
  de nav globale sera branché par KAN-28 (shell acheteur)
- Aucune nouvelle table, aucune nouvelle policy RLS, aucune migration
- Réutilisation des primitives empty state / cards posées côté producteur
  (KAN-18/19) si mutualisables, sinon composants locaux `components/buyer/`
- Microcopy des empty states neutre, jamais de référence à un ticket interne
- Les 3 stats et les filtres sont rendus désactivés (présents visuellement) —
  pas masqués — pour rester fidèle à la maquette sans fausse interaction
