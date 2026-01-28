# Allo Souvenirs - Design Final

## Resume

Application web (PWA) pour iPad en mode paysage. Les invites d'un evenement enregistrent des messages video. Interface personnalisable selon le type d'evenement, avec un telephone retro pour l'audio.

## Les 5 Ecrans

### 1. Ecran Accueil (invites)

- Photo de presentation (optionnelle)
- Logo client (optionnel)
- Texte principal (ex: "Mariage Sophie & Marc")
- Texte secondaire optionnel (ex: "20 mars 2026")
- Position du texte configurable (dessus / dessous / superpose la photo)
- Bouton "Enregistrer" style selon le theme
- Aucune autre interaction possible
- Ecran toujours allume (pas de mise en veille)

### 2. Ecran Decompte

- Countdown configurable (5s, 10s, 15s)
- Message traduit : "Decrochez le telephone et attendez le bip"
- A zero → passe automatiquement a l'enregistrement

### 3. Ecran Enregistrement

- Camera frontale plein ecran (verrouillee, 1080p, 30fps)
- Bouton Stop en bas
- Pas de limite de temps
- Fichier nomme automatiquement : YYYY-MM-DD_HHhMM.mp4

### 4. Ecran Confirmation

- "Video enregistree !" pendant 3 secondes
- Logo Allo Souvenirs discret
- Retour automatique a l'ecran principal

### 5. Page Admin (#setup)

Acces : Code PIN 2402

#### Onglet "Evenement"

- Texte principal
- Texte secondaire (optionnel)
- Photo de presentation (upload)
- Logo client (upload, optionnel)
- Position du texte (dessus / dessous / superpose)
- Langue des invites (FR / EN / AR)
- Duree du countdown (5s / 10s / 15s)
- Boutons : Previsualiser + Sauvegarder

#### Onglet "Apparence"

- Choix du theme de base (liste des 7)
- Couleur du fond (selecteur)
- Couleur du texte (selecteur)
- Couleur des boutons (selecteur)
- Couleur d'accent (selecteur)
- Apercu en direct

#### Onglet "Videos"

- Liste des videos avec date/heure
- Telecharger une video
- Telecharger tout (ZIP)
- Supprimer une video
- Tout supprimer (avec confirmation)

## Themes (prereglages modifiables)

| Theme | Ambiance |
|-------|----------|
| Mariage Classique | Creme + or, elegant |
| Mariage Luxe | Noir + dore, sophistique |
| Baby Shower | Rose poudre, doux |
| Corporate | Gris + bleu marine, pro |
| Festif | Violet + dore, soiree |
| Marque / Lancement | Moderne, epure |
| Hotellerie | Beige + marron, luxe discret |

Tous les themes sont personnalisables avec des couleurs custom.

## Langues

Admin : Toujours en francais.

Ecrans invites : Configurable (FR / EN / AR avec RTL).

| Ecran | FR | EN | AR |
|-------|----|----|-----|
| Accueil | Enregistrer un message | Record a message | سجّل رسالة |
| Decompte | Decrochez le telephone et attendez le bip | Pick up the phone and wait for the beep | ارفع السماعة وانتظر الصافرة |
| Enregistrement | Arreter | Stop | إيقاف |
| Confirmation | Video enregistree ! | Video recorded! | !تم تسجيل الفيديو |

## Technique

- Vanilla HTML/CSS/JS (pas de framework)
- PWA hors-ligne (fonctionne sans internet)
- Videos stockees sur l'iPad (IndexedDB)
- Heberge sur GitHub Pages (chemins relatifs)
- Camera frontale uniquement, verrouillee, 1080p, 30fps
- Font : Tangerine (fournie)
- Logos : Allo Souvenirs (fournis)

## Structure des fichiers

```
allosvrs/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   ├── main.css
│   └── themes.css
├── js/
│   ├── app.js
│   ├── camera.js
│   ├── storage.js
│   ├── i18n.js
│   └── admin.js
├── assets/
│   ├── fonts/
│   └── logos/
└── locales/
    ├── fr.json
    ├── en.json
    └── ar.json
```
