# Tâches techniques internes — KAN-29 Zone non couverte & liste d'attente

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers
> partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké
> comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> - KAN-90 — Consulter la fiche détaillée d'un produit (photos, prix, producteur)
> - KAN-91 — Voir le profil public du producteur depuis la fiche produit
> - KAN-92 — Ajouter un produit à ses envies (wishlist privée)
>
> ⚠️ Ces trois subtasks décrivent la fiche produit / le profil producteur / la
> wishlist — périmètre KAN-28 (fiche AC-05) et KAN-30 (wishlist), pas AC-12.
> Rattachement à revoir côté Jira (hors scope de ce cadrage). Signalé en chat.

## Tâches

- [ ] Migration : table `zone_waitlist` (`user_id`, `postal_code`, `city`,
      `zone_label`, `created_at`, `notified_at` nullable) + unicité
      (`user_id`, `postal_code`) + index sur `postal_code`.
- [ ] RLS `zone_waitlist` : `insert_self` + `select_self` (aucune lecture
      publique de la table).
- [ ] RPC `SECURITY DEFINER` `waitlist_zone_count(postal_code)` → `int`
      (compteur agrégé, aucune PII) + test SQL de non-exposition.
- [ ] `waitlistRepo` dans `packages/db` (insert idempotent `on conflict do
      nothing`, `zoneCount` via RPC ; + mapper DB→DTO si utile).
- [ ] Contracts `WaitlistSignupInput` + `WaitlistSignupResult` /
      `WaitlistZoneCount` (+ tests).
- [ ] Endpoint `POST /api/v1/waitlist` (validation Zod, gating rôle acheteur,
      idempotence, codes d'erreur).
- [ ] Page AC-12 `acheteur/catalogue/zone-non-couverte` sous le shell KAN-28
      (badge zone depuis profil, formulaire liste d'attente, compteur SSR réel).
- [ ] Composants `components/buyer/waitlist/*` (carte liste d'attente + état
      confirmé, actions secondaires en différé, suggestion zone proche neutre).
- [ ] Câbler « Changer de zone de livraison » vers les paramètres zone (KAN-25).
      Laisser « Parrainer » inerte/différé (récompense hors scope MVP).
- [ ] Décider et documenter le **point d'entrée** de AC-12 (lien explicite au
      MVP ; auto-trigger « zone non couverte » différé KAN-42).
- [ ] Seeds/fixtures E2E : acheteur vérifié avec zone renseignée pour tester
      l'inscription et le compteur.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
