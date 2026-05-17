# Données de test — Delta

Référentiel des données fictives à utiliser pour les smoke tests / E2E sur les flows Delta. Tous les services Delta tournent en **test mode** tant qu'on n'a pas activé le live mode (cf. `tech/setup.md`).

> Source unique de vérité : ce fichier. À étendre au fur et à mesure que de nouveaux services / flows arrivent. Pas de secrets ici — uniquement des valeurs publiques / fictives reproductibles.

---

## Auth (Supabase)

### Création de compte test

| Champ | Valeur recommandée |
|---|---|
| Email | `<votre-email>+test<N>@<domaine>` (la technique `+test1`, `+test2`, etc. crée des alias distincts pour Supabase mais tous les emails arrivent dans ta vraie boîte si ton provider supporte les sous-adresses — Gmail / Google Workspace / Fastmail oui) |
| Mot de passe | `Motdepasse2026` ou `Delta2026Test` (10 caractères mini, 1 majuscule, 1 minuscule, 1 chiffre — cf. `passwordPolicy` partagée signup / reset) |

### Contourner l'OTP / le rate-limit email

Free tier Supabase = **30 emails / heure / projet** sur le sender par défaut. Largement dépassable en session de tests.

**Workaround** : confirmer le user manuellement côté Supabase Studio :
- Authentication → Users → le user concerné → menu `⋯` → **Confirm user**
- Le bouton "Confirm user" valide l'email côté `auth.users.email_confirmed_at` ET déclenche le trigger métier (création de la row `public.users`).

Tant qu'on est sur Resend (post-MVP, cf. `tech/setup.md` § Resend *À faire*), accepter ce workaround pour les sessions de tests intensives.

### Sélection de rôle (AU-06)

Tous les rôles sont sélectionnables. Si tu veux tester un parcours spécifique :
- Producteur → onboarding `/onboarding/producteur` (KAN-16, livré)
- Rameneur → `/onboarding/rameneur` (placeholder KAN-37)
- Acheteur → `/onboarding/acheteur` (placeholder KAN-25)

Le `nextOnboardingPath()` priorise rameneur > producteur > acheteur ; si tu coches plusieurs rôles, tu seras routé en priorité sur le premier de la liste.

---

## SIRET / API Sirene INSEE (KAN-16)

L'API Sirene est un référentiel **réel** des établissements français — pas de SIRET « de test » dédié. Trois patterns d'usage :

### Cas verified (happy path)

Choisir un vrai SIRET d'entreprise française active depuis https://annuaire-entreprises.data.gouv.fr/.

**Reproductible** : siège INSEE
| Champ | Valeur |
|---|---|
| SIRET | `30963495400015` (à vérifier sur l'annuaire — la dénomination renvoyée peut surprendre, cf. cas vérifié 2026-05-17 = `REPARATION ENTRETIEN ET MAINTENANCE`) |
| Raison sociale | **Exactement** ce que renvoie Sirene pour ce SIRET (fuzzy match tolérant la forme juridique + accents + ponctuation, mais pas une dénomination radicalement différente) |
| Forme juridique | `EARL` / `SCEA` / `SARL` / `Auto-entrepreneur` / `SAS` / `GAEC` (whitelist du contrat Zod) |
| Code NAF | `01.13Z` (format `XX.XXY`, lettre finale optionnelle) |

**Vérification rapide** côté terminal (clé API depuis Vercel) :
```bash
curl 'https://api.insee.fr/api-sirene/3.11/siret/30963495400015' \
  -H "X-INSEE-Api-Key-Integration: $INSEE_SIRENE_API_KEY" \
  | jq '.etablissement.uniteLegale.denominationUniteLegale'
```

### Cas rejected (raison sociale incorrecte)

Reprendre un SIRET valide mais avec une raison sociale **complètement différente** :
| SIRET | `30963495400015` |
| Raison sociale | `Ma Ferme du Bocage` (sans rapport avec ce qu'INSEE retourne) |

Le job Inngest passera le statut à `rejected` avec `siret_rejection_reason` détaillé.

### Cas rejected (SIRET inexistant)

| SIRET | `12345678901234` (14 chiffres, format valide mais SIREN inexistant) |

INSEE renvoie 404 → notre client retourne `null` → statut `rejected` avec raison `"SIRET introuvable dans la base Sirene."`

### Re-tester après un statut terminal

`siret_status = verified` bloque toute re-soumission (409). Pour rejouer, supprimer la row côté Supabase Studio :
```sql
DELETE FROM public.producers WHERE user_id = '<uuid-du-user>';
```
Ou supprimer le user entier dans `auth.users` (cascade sur `public.users` puis `public.producers`).

---

## Stripe Connect Express (KAN-16)

Tous les comptes Connect sont créés en **test mode** (`acct_test_*` ou `acct_1***`). Aucune somme réelle ne transite, aucune vérification d'identité réelle n'est faite — mais Stripe applique la même UX qu'en prod, donc on doit remplir des données plausibles pour passer les étapes.

### Identité représentant

| Champ | Valeur de test |
|---|---|
| Nom légal (prénom / nom) | Ton vrai nom **ou** n'importe quel couple type `Jean Dupont` |
| Date de naissance | N'importe quelle date dans le passé majeure (ex. `01/01/1990`) |
| Adresse personnelle | `37 Rue Des Mallets, 95150 Taverny, France` (adresse valide format français — Stripe ne vérifie pas l'existence) |
| Téléphone | `+33 6 12 34 56 78` ou n'importe quel mobile FR formaté |

⚠️ Stripe Connect Express en test mode n'auto-vérifie **pas** les comptes FR depuis fin 2024. Le compte reste en `restricted` tant que le document d'identité n'est pas uploadé ET que toutes les requirements sont remplies. Cf. KAN-158 pour le polish UX du cas `restricted`.

### Document d'identité

Stripe accepte n'importe quelle image en test mode. Pour éviter de chercher une photo de pièce d'identité :
- Génère une image quelconque (capture d'écran, photo random — taille mini ~50 KB)
- Upload en tant que recto ET verso d'une carte d'identité française
- Stripe la stocke et marque la vérification comme « En cours » puis « Vérifié » sous quelques secondes en test mode

### IBAN test (officiel Stripe)

| Pays | IBAN test | Comportement |
|---|---|---|
| France | `FR1420041010050500013M02606` | ✓ Validation succès, payouts simulés |
| France (échec) | `FR12 3000 4000 0312 3456 7890 143` | ✗ Validation échec (pour tester le cas d'erreur) |

Source : https://docs.stripe.com/connect/testing#test-bank-account-numbers

### Forcer `payouts_enabled = true` rapidement

Une fois le KYC validé + IBAN renseigné, **Stripe peut mettre 1 à 30 minutes** pour passer `payouts_enabled` à `true` en test mode. Pour accélérer :
- Dashboard Stripe test → Connected accounts → ton compte → bouton **« Mark as verified »** (si disponible)
- Ou attendre l'event `account.updated` final (visible côté Workbench → Webhooks)

### Forcer un event webhook côté CLI (Stripe CLI)

Si Stripe CLI installée (cf. `tech/setup.md` § Stripe Connect Express) :
```bash
stripe trigger account.updated --add account:payouts_enabled=true
```
L'event part vers les destinations webhook configurées (notre endpoint Vercel les reçoit).

### Re-tester un parcours producteur depuis zéro

Supprimer le compte Connect côté dashboard Stripe (Connected accounts → menu `⋯` → Delete) + nettoyer la row Delta :
```sql
DELETE FROM public.producers WHERE user_id = '<uuid-du-user>';
DELETE FROM public.stripe_webhook_events WHERE payload->>'account' = '<acct_id>';
```

---

## Workflow de smoke test producteur complet (KAN-16)

Séquence recommandée pour valider end-to-end :

1. **Signup** : `https://delta-web-gamma.vercel.app/signup` → mail `+test1@...` + password de référence
2. **Confirmer l'email** : Supabase Studio → Authentication → Users → Confirm user
3. **Sélection rôle** : `/onboarding/role` → cocher Producteur uniquement → Continuer
4. **Étape SIRET** : utiliser le cas verified ci-dessus → vérifier dans Supabase que `producers.siret_status = verified` après ~1s (job Inngest)
5. **Étape Stripe** : cliquer Configurer Stripe Connect → remplir avec les valeurs de test ci-dessus → Continuer jusqu'au bout
6. **Retour `/stripe/return`** : vérifier qu'il y a une row dans `stripe_webhook_events` et que `producers.stripe_account_id` est rempli
7. **Si `restricted`** : compléter les requirements côté dashboard Stripe (ce sera couvert par l'UX de KAN-158 plus tard)

---

## À étendre quand les features arrivent

- **Acheteur** (KAN-25, KAN-28) : préférences catégories, adresses Adresse Gouv.fr, wishlist
- **Rameneur** (KAN-37, KAN-41) : trajet, capacité véhicule, Stripe Identity
- **Mission** (KAN-43, KAN-45, KAN-46, KAN-48) : flow réservation, QR pickup/delivery
- **Paiement** (KAN-33, KAN-34) : cartes de test Stripe (`4242424242424242` etc.), test clocks pour simuler l'escrow

Cf. `tech/setup.md` pour le statut de provisionnement de chaque service.
