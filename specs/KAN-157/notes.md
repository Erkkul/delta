# Notes — KAN-157

## Conflits maquette ↔ spec

### Écrans AU-FP absents du bundle Figma — 2026-05-16

Les maquettes `pr/ac/rm-01-authentication.html` référencent KAN-157 dans leur commentaire d'en-tête mais le bundle Figma exporté ne contient **aucun écran dédié** à la récupération de mot de passe (recherche `forgot/oubli/reset/recovery` → 0 hit ; seul `OTP` est présent, hérité de l'écran AU-04 « Vérifiez votre email » du flow signup).

**Décision (à arbitrage Erkkul si désaccord)** : au MVP, on **ne demande pas** de ré-export Figma. Les trois écrans AU-FP1/FP2/FP3 sont composés par réutilisation visuelle de briques existantes :

- AU-FP1 = `AuthSplitLayout` + `AuthHeroPanel` + un champ email (réutilise l'esthétique d'AU-02 signup, sans le champ password)
- AU-FP2 = écran de confirmation neutre (réutilise la structure d'AU-04 verify-email avec un message d'info au lieu du formulaire OTP)
- AU-FP3 = `OtpForm` (KAN-2) + `PasswordField` (à extraire de `SignupForm`, cf. `tasks.md`)

**Trigger pour repasser en mode "Figma authoritative"** : si une refonte UX du flow auth est demandée, ou si l'écran AU-FP3 nécessite un visuel spécifique (ex : illustration confiance), ouvrir un ticket design dédié et ré-exporter les 3 maquettes auth depuis Figma.
