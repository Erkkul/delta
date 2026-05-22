# Cadrage — KAN-25 Onboarding & zone

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-25
- Epic : KAN-6 Profil Acheteur
- Maquette : design/maquettes/acheteur/ac-02-onboarding.html (étape 1), design/maquettes/acheteur/ac-11-profil.html
- PRD : §10 sitemap acheteur (AC-02 Onboarding, AC-11 Profil + paramètres) — PRD local non versionné
- ARCHITECTURE : §5 (DB + RLS), §7 (matching géo, buffer 10 km), §3 (API), §10 (tests)

## Pourquoi (côté tech)

Après création de compte (KAN-2) et choix du rôle acheteur (AU-06), l'acheteur
doit déclarer sa zone d'habitation. Cette zone est le point géographique qui
alimente le pipeline de matching (ARCHITECTURE §7.2 étape 3 :
`ST_DWithin(buyer_address, route_geom, 10000)`) — sans elle, aucune opportunité
ne peut être proposée à un rameneur côté destination. KAN-25 pose le profil
acheteur minimal (nom + zone), sa capture à l'onboarding (KAN-81) et son
édition depuis les paramètres (KAN-82).

## Périmètre technique

**In scope :**

- Étape 1 du wizard onboarding acheteur AC-02 « Où vivez-vous ? » : saisie zone
  via autocomplete API Adresse Gouv.fr, persistance d'un point géographique.
- Profil acheteur minimal : nom d'affichage + zone d'habitation (adresse label +
  ville + code postal + `geography(Point)`).
- Édition de la zone depuis les paramètres (AC-11, KAN-82).
- Réutilisation / promotion du composant `address-autocomplete.tsx`
  (`producer/` → `forms/`) en composant partagé.

**Out of scope (cette US) :**

- Étape 2 catégories (KAN-26) et étape 3 notifications (KAN-14) du wizard AC-02.
- Gestion de plusieurs adresses (max 3, labels, codes porte) visible sur AC-11 :
  KAN-25 ne gère qu'une zone principale unique. Multi-adresses → ticket dédié.
- Wishlist, préférences catégories, paramètres notifications.
- Onboarding rameneur (KAN-37) et producteur (KAN-16).

## Hypothèses

- **Nom à l'onboarding (à valider)** : KAN-81 mentionne « nom + zone » mais la
  maquette AC-02 étape 1 n'affiche que le champ adresse. Hypothèse retenue :
  on ajoute un champ « nom » à l'étape 1 (ou un sous-écran), à confirmer avec
  le produit — conflit maquette ↔ subtask à arbitrer.
- La zone est obligatoire pour finaliser l'onboarding acheteur, mais le bouton
  « Passer » de la maquette permet de différer (zone null tant que non saisie ;
  pas de matching tant qu'absente).
- Un compte multi-rôle a 0 ou 1 profil acheteur (`buyer_profiles.user_id` UNIQUE),
  miroir du pattern `producers` (KAN-16).
- Stockage géo en `geography(Point, 4326)`, index GIST, cohérent avec §7.
