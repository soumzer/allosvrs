# Prompt Claude Code — Allô Souvenirs MVP event 1

Copier-coller ce bloc dans Claude Code dans le repo `~/Claude-Workspace/projects/allosvrs/`.

---

Salut. Tu es positionné dans le repo de ma webapp Allô Souvenirs.

## CONTEXTE BUSINESS

- Video guestbook haut de gamme pour events à Dubaï (mariages, corporate, anniversaires). Phase 0 (1er event à venir).
- Mon client = le host (mariés, corporate). Pas l'invité.
- Je suis basé à Dubaï. Conformité PDPL (UAE Federal Decree-Law n°45 de 2021) et UAE Cybercrime Law (n°34 de 2021) à respecter.

## CONTEXTE TECHNIQUE (vérifié)

- PWA vanilla HTML/CSS/JS, installée en mode standalone sur iPad (landscape).
- 100% client-side : IndexedDB (`videos` + `images`), localStorage (config). Aucun backend.
- Multilingue déjà en place via `locales/*.json` (FR, EN, AR, UR, HI, RU).
- Wake Lock déjà implémenté dans `app.js`, ne pas y toucher.
- PIN admin `'2402'` HARDCODÉ dans `js/storage.js` (devinable, à changer).
- `<html lang="fr">` figé dans `index.html`, pas de gestion `dir="rtl"`.
- Partage host actuel = bouton "Tout télécharger (ZIP)" dans admin panel (`js/admin.js`, lib `jszip` déjà incluse).
- Service worker version actuelle : `allosvrs-v27` dans `sw.js`.
- L'écran d'accueil utilise une **photo Canva personnalisée par event**, avec le texte "Enregistrer un message" déjà écrit DANS la photo. Le bouton `#btn-record` actuel affiche un texte "Enregistrer" en doublon, à supprimer.

## CONTRAINTES ABSOLUES

- Reste en vanilla : pas de framework, pas de build step, pas de bundler. Libs externes via CDN uniquement si vraiment justifié.
- Ne touche PAS à la logique d'enregistrement vidéo, countdown, IndexedDB storage core, Wake Lock, ni au système i18n. Tout ça fonctionne.
- Le wording du consentement DOIT être cohérent avec l'Appendice A du contrat `~/Claude-Workspace/projects/site-Allô Souvenirs/Image_Rights_Release_Agreement.docx`. Lis-le avant. N'invente pas un nouveau wording juridique.
- Lis d'abord `docs/plans/2026-01-28-allo-souvenirs-implementation.md` et `-design.md` pour comprendre les décisions d'architecture déjà prises. Signale toute contradiction avec mes demandes ci-dessous.

## PHASE 1 — AUDIT, NE CODE RIEN

1. Lis la structure complète (`index.html`, `js/`, `css/`, `locales/`, `sw.js`, `manifest.json`).
2. Lis les 2 plans dans `docs/plans/` et signale les contradictions.
3. Lis l'Appendice A du contrat dans `site-Allô Souvenirs/Image_Rights_Release_Agreement.docx`.
4. Présente-moi un plan structuré pour les changements ci-dessous, avec pour chaque item : fichiers impactés, complexité, dépendances, risques. Format : tableau impact/effort + plan P0 / P1 / P2, max 2 pages.

## PHASE 2 — CHANGEMENTS À PLANIFIER (P0, avant 1er event)

### A) Écran de consentement post-enregistrement

- Nouvelle section `#screen-consent` entre `#screen-recording` et `#screen-confirmation` dans `index.html`.
- UNE seule case, **DÉCOCHÉE PAR DÉFAUT** (non négociable, PDPL art. 6) :
  > ☐ Allô Souvenirs can share my video on social media (@allosouvenirs). If featured, DM us to get your HD copy.
  >
  > *Either way, your video is sent to [Host names].*
- 1 bouton "Continue" qui sauvegarde le choix et passe à confirmation.
- Petit lien gris "Learn more →" en bas, opacity ~0.6, qui ouvre un modal FAQ in-app (point B).
- Wording dans `locales/*.json` (FR + EN + AR minimum).
- Si la case est cochée → `promoAuthorized: true`, sinon `false`.

### B) Modal FAQ in-app

- Overlay plein écran (pas une nouvelle URL, pas Safari).
- 5 bullets max, lisible en 20s, pas de scroll :
  - Who gets my video? → The hosts.
  - Will my video be on social media? → Only if you ticked the box.
  - How do I get my HD copy? → DM @allosouvenirs if featured, otherwise ask the hosts.
  - I changed my mind, can you remove it? → Email contact@allosouvenirs.com, removal within 15 days.
  - How is my data handled? → Stored locally on the iPad, given to the hosts. No email/phone collected.
- En bas du modal : URL `allosouvenirs.com/guest` + petit QR PNG **fourni par moi** dans `assets/qr-guest.png` (je le génère externalement, ne génère pas de QR en JS).
- Bouton "Back" en haut qui revient à l'écran consent.
- Multilingue via `locales/*.json`.

### C) Stockage

- Ajouter une clé `promoAuthorized: bool` à chaque record vidéo dans `js/storage.js`.
- Modifier `saveVideo(blob)` → `saveVideo(blob, promoAuthorized)`.
- **PAS** de migration IndexedDB (records schema-less).
- **PAS** de bump de la version DB (`AlloSouvenirsDB` reste en v2).

### D) Export ZIP — manifest

- Modifier le bouton `#btn-download-all` dans `js/admin.js`.
- Inclure un `manifest.json` à la racine du ZIP listant chaque vidéo avec `filename`, `timestamp`, `promoAuthorized`.

### E) Positionnement bouton enregistrer — refonte drag/resize

- Remplacer la grille 3×3 dans l'onglet Event de l'admin par un système drag-and-drop sur preview live de la photo Canva.
- Le bouton `#btn-record` devient une **zone tactile invisible** (background transparent, pas de texte, pas de border en prod).
- L'admin doit pouvoir : drag (positionnement) + resize par les coins (taille). Snap aux bords/centre à ±5%.
- Affichage en preview admin : rectangle pointillé semi-transparent pour visualiser la hitbox (uniquement en mode admin).
- Nouveau format de config : `buttonPosition: { x: 50, y: 85, width: 30, height: 10 }` (en % du viewport).
- Supprimer les 9 classes CSS `.btn-pos-*`.
- Fallback : si l'ancienne config string existe (ex: `"bottom-center"`), mapper automatiquement vers le nouveau format.

### F) Langue & RTL

- Dans `js/i18n.js`, fonction `load(lang)`, ajouter 2 lignes :
  ```js
  document.documentElement.lang = lang;
  document.documentElement.dir = ['ar','ur'].includes(lang) ? 'rtl' : 'ltr';
  ```
- Ajustements CSS RTL **uniquement** pour le nouvel écran de consentement et le modal FAQ. Les autres écrans actuels restent intacts (visuellement minimalistes, l'algo Unicode bidi gère).

### G) Hardening iPad

- Ajouter dans `css/main.css` (en haut, sur `html, body`) :
  ```css
  overscroll-behavior: none;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  ```
- Changer le PIN dans `js/storage.js` : remplacer `'2402'` par un code à 4 chiffres non significatif (random, à me proposer).
- Bump `CACHE_NAME` dans `sw.js` : `allosvrs-v27` → `allosvrs-v28`.
- Ajouter à la liste `ASSETS` dans `sw.js` les nouveaux fichiers (qr-guest.png, locales mises à jour, etc.).

## PHASE 2 BIS — DÉLIVRABLES HORS REPO ALLOSVRS

### H) Page publique `/guest`

- À créer dans le repo voisin `~/Claude-Workspace/projects/site-Allô Souvenirs/`.
- Page HTML statique simple, EN + AR minimum, mobile-first.
- Contenu = même FAQ que le modal in-app, version un peu plus détaillée + mention PDPL information notice (art. 13) + contact email + liens Insta/TikTok.
- URL cible finale : `allosouvenirs.com/guest`.

## RÉFÉRENCES JURIDIQUES (déjà rédigées, à RESPECTER)

Dans `~/Claude-Workspace/projects/site-Allô Souvenirs/` :
- `Image_Rights_Release_Agreement.docx` — version Standard (3-4 pages, Appendice A = wording iPad de référence).
- `Image_Rights_Release_Light.docx` — version Light (1 page, signée par défaut sur petits events).

Ces deux documents sont les sources de vérité légale. Le wording de l'app doit s'aligner sur l'Appendice A.

## WORKFLOW DEMANDÉ

- AUDIT D'ABORD (phase 1). Tu me présentes le plan. Je valide.
- Puis on attaque les items UN PAR UN, validation à chaque étape.
- Step by step, pas de gros commit massif.
- Pour chaque modif, montre-moi le diff avant d'écrire.
- Si tu as un doute sur une décision, pose-moi la question, n'invente pas.

C'est parti. Commence par la phase 1 (audit + plan).
