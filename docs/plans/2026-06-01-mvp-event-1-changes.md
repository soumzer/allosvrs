# Allô Souvenirs — MVP Event 1 Changes (source of truth)

> Ce document remplace les deux plans `2026-01-28-*` comme source de vérité.
> Les plans de janvier 2026 sont conservés comme historique mais ne reflètent
> plus l'état actuel du code ni des décisions produit.

## Contexte

Itération avant le 1er event payant à Dubaï (Phase 0). Objectif : mettre
l'app en conformité PDPL (UAE Federal Decree-Law n°45 de 2021) et UAE
Cybercrime Law (n°34 de 2021), et finaliser l'UX iPad.

## Décisions clés validées (2026-06-01)

| Sujet | Décision |
|---|---|
| **Wording consent** | Le texte du brief fait foi (pas l'Appendice A à la lettre). |
| **Mention 18+** | Petit texte gris sous le bouton Continue, pas de case dédiée. |
| **Email de retrait** | `allosouvenirs@gmail.com` (forwarding à brancher plus tard). |
| **Mineurs** | 6ème bullet dans le modal FAQ ("Under 18? Ask a parent…"). |
| **Host names** | Champ admin dynamique (`Config.hostNames`), injecté via `{host}`. |
| **Manifest ZIP** | Global dans chaque part ZIP, listant toutes les vidéos. |
| **Locales nouvelles clés** | FR + EN + AR seulement. UR/HI/RU = fallback EN. |
| **PIN admin** | Reste `2402` (décision user, ne pas changer). |
| **Drag/resize bouton (E)** | Ship pour event 1, pas de fallback grille. |
| **Page /guest (H)** | Repo voisin `site-Allô Souvenirs/`, en parallèle. |
| **i18n RTL** | Déjà géré dans `i18n.js` lignes 10-11 — aucun JS à ajouter. |

## Bloqueurs levés

- ✅ `Image_Rights_Release_Agreement.docx` (Standard, Appendice A) reçu
  le 2026-06-01. Consultable pour l'esprit, mais le wording de la case
  validé par le user fait foi.
- ⏳ `assets/qr-guest.png` à fournir par user. Placeholder accepté en attendant.

## Ordonnancement P0 (avant event 1)

1. **A** — Écran de consentement post-recording (en cours)
2. **C** — `saveVideo(blob, promoAuthorized)` + champ IndexedDB
3. **B** — Modal FAQ in-app
4. **F** — CSS RTL pour consent + modal uniquement
5. **D** — Manifest JSON dans ZIP export
6. **G.1/G.3** — `user-select:none` + bump SW v27→v28 + ASSETS list

## P1 (en parallèle)

7. **E** — Drag/resize positionnement bouton
8. **H** — Page publique `/guest` (repo voisin)

## P2 (post-event 1)

- Traduction UR/HI/RU des nouvelles clés consent/FAQ
- Forwarding `allosouvenirs@gmail.com` → adresse pro

## Tech debt P1 (à traiter post-event 1)

Findings d'audit non bloquants pour event 1 :

- **F3 — Memory leak `URL.createObjectURL`** : dans `_loadPositionPreview()`
  et `loadImagePreview()` (`js/admin.js`), chaque appel crée un nouveau
  Blob URL sans `URL.revokeObjectURL()` de l'ancien. Invisible sur usage
  normal (admin ouvert quelques minutes), s'accumule sur re-uploads
  intensifs. À patcher avec un tracking des URLs créés.

- **F4 — Pas d'indicateur visuel "position sauvegardée"** dans l'admin
  drag/resize. Après save, l'admin clique "Prévisualiser" pour voir
  l'effet, mais aucun feedback immédiat dans le panneau. Ajouter un
  flash/animation au save.

- **F5 — `setTimeout(showScreen('main'), 5000)`** dans
  `_onConsentChoice` (`js/app.js`) n'est pas annulable. Si l'invité
  tape rapidement après confirmation, comportement à valider en
  conditions réelles. Idéalement : tracking du timeout + clear si
  l'invité interagit.

## Contraintes techniques (rappel)

- Vanilla HTML/CSS/JS — pas de framework, pas de build, pas de bundler
- 100% client-side (IndexedDB + localStorage)
- Ne PAS toucher : enregistrement vidéo, countdown, IndexedDB core,
  Wake Lock, système i18n
- AlloSouvenirsDB reste en v2 (records schema-less, pas de migration)
