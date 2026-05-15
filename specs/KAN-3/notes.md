# Notes — KAN-3 Connexion

> Notes d'implémentation et points reportés à des tickets aval. Pas dans Jira, pas dans le mapping — propre au ticket.

## Points à traiter dans KAN-157 (Récupération de mot de passe)

### Gap UX : utilisateur avec compte non vérifié bloqué silencieusement

**Symptôme** : un utilisateur qui a créé son compte mais n'a jamais validé son OTP de vérification email (AU-04) ne peut pas se connecter. Supabase Auth renvoie `email_not_confirmed`, que notre route handler `/api/v1/auth/login` mappe en `InvalidCredentialsError` (401 générique « Identifiants invalides. »).

**Pourquoi opaque** : décision sécurité — l'anti-énumération exige qu'on ne distingue jamais email inconnu, mauvais mot de passe, ou email non vérifié. Tout fait fuiter l'existence du compte. Cf. `specs/KAN-3/design.md` §Risques techniques.

**Conséquence** : l'utilisateur est bloqué sans recours visible depuis `/login`. Il pense que son compte n'existe pas ou que son mot de passe est faux. Il ne sait pas que son OTP est toujours en attente quelque part dans sa boîte mail.

**À faire dans KAN-157** :

1. **Inclure le renvoi OTP dans le flow « Mot de passe oublié »** — quand l'utilisateur saisit son email pour reset son mdp, en arrière-plan détecter si le compte existe avec `email_confirmed_at = NULL` et déclencher un renvoi OTP en plus (ou à la place) du lien de reset. Le message UX reste générique côté front (« Si un compte existe, vous recevrez un email »).
2. **Alternative ou complément** : ajouter une route `/auth/verify-email` accessible depuis le pied de page de `/login` (« Vous avez créé un compte mais n'avez pas reçu le code ? »). L'écran AU-04 existe déjà côté KAN-2, il suffit de l'exposer depuis le login. Renvoi OTP déjà implémenté côté `/auth/verify-email` (bouton « Renvoyer le code »).

**Lien de référence côté code** : `apps/web/app/api/v1/auth/login/route.ts` — adapter `signInWithPassword` du use case `coreAuth.loginWithEmail`. Le commentaire dans le route handler signale ce gap (`TODO(KAN-157)`).

**Pas un bug à corriger dans KAN-3** : la sécurité prime sur l'UX au MVP. Le contournement actuel (recréer un compte avec le même email → 409 EmailAlreadyTaken → message clair) est dégradé mais fonctionnel pour les early users.

---

## Pas de conflit maquette / DESIGN.md

Les maquettes `pr-01-authentication.html`, `ac-01-authentication.html`, `rm-01-authentication.html` sont les mêmes que KAN-2 (couvrent signup + login). Le contenu JSX est gzipé+base64 dans le bundle Figma (1,5 MB), non extractible directement. L'implémentation reprend le pattern visuel de `SignupForm` (KAN-2) — même chrome `AuthSplitLayout` + `AuthHeroPanel`, mêmes tokens DESIGN.md, microcopy déduite de `specs/KAN-3/design.md` §État UI.
