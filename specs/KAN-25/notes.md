# Notes d'implémentation — KAN-25

## Conflit maquette ↔ subtask : champ « nom » à l'onboarding (KAN-81)

- **KAN-81** demande explicitement de « renseigner son nom **et** sa zone d'habitation lors de l'onboarding ».
- La maquette **AC-02** (`design/maquettes/acheteur/ac-02-onboarding.html`) étape 1 n'affiche **que** le champ adresse — pas de champ nom. La maquette **AC-11** montre pourtant un nom d'acheteur (« Marie Dubois »).

**Arbitrage appliqué (à confirmer produit)** : on capture le nom **et** la zone à l'étape 1, le nom en premier champ (saisie simple, tokens DESIGN.md). La colonne `buyer_profiles.display_name` est nullable et le champ reste facultatif côté UI pour ne pas bloquer le « Passer » de la maquette. Conflit signalé ici pour arbitrage — si le produit préfère capter le nom ailleurs (signup, autre écran), retirer le champ de l'étape 1 sans toucher au modèle de données.

## Espace `/acheteur` non encore construit

- L'accueil acheteur AC-03 (`/acheteur`) relève de **KAN-28** (non livré). `getRoleHomePath(["acheteur"])` y pointe déjà mais la route n'existe pas encore.
- Pour KAN-25, la fin d'onboarding et le lien « Passer » redirigent vers **`/acheteur/profil`** (page paramètres livrée par cette US, KAN-82) plutôt que vers un `/acheteur` qui renverrait 404. À rebrancher sur l'accueil quand KAN-28 le livrera.

## Multi-adresses (AC-11) hors scope

AC-11 montre jusqu'à 3 adresses de livraison (labels, codes porte). KAN-25 ne gère qu'une **zone principale unique**. Multi-adresses → ticket dédié.
