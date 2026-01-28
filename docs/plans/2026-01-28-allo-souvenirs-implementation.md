# Allo Souvenirs - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a PWA video guestbook app for iPad (landscape) where event guests record video messages. Admin configures events, exports videos.

**Architecture:** Single-page vanilla app with 5 screens (sections shown/hidden). Config in localStorage, videos + uploaded images in IndexedDB. PWA with service worker for offline. 7 theme presets with full color customization. 3 guest languages (FR/EN/AR with RTL).

**Tech Stack:** Vanilla HTML/CSS/JS, IndexedDB, MediaRecorder API, Service Worker, JSZip (for ZIP export via CDN)

---

## Asset Locations

- **Font:** `/Users/yassine/Downloads/Tangerine/Tangerine.otf`
- **Logos (icon only):** `/Users/yassine/Desktop/1. DA/1. Visuels finis/1. Logo/Logo/Colors/`
  - `Logo black.png`, `Logo white.png`
- **Pastille logos:** `/Users/yassine/Desktop/1. DA/1. Visuels finis/1. Logo/Logo/Pastille/`
  - `Pastille black.png`, `Pastille white.png`

---

### Task 1: Project Scaffolding & Assets

**Files:**
- Create: `allosvrs/index.html`
- Create: `allosvrs/css/main.css`
- Create: `allosvrs/css/themes.css`
- Create: `allosvrs/js/app.js`
- Create: `allosvrs/js/camera.js`
- Create: `allosvrs/js/storage.js`
- Create: `allosvrs/js/i18n.js`
- Create: `allosvrs/js/admin.js`
- Create: `allosvrs/manifest.json`
- Create: `allosvrs/sw.js`
- Copy assets into: `allosvrs/assets/fonts/`, `allosvrs/assets/logos/`

**Step 1: Copy assets into project**

```bash
mkdir -p allosvrs/assets/fonts allosvrs/assets/logos allosvrs/css allosvrs/js allosvrs/locales
cp "/Users/yassine/Downloads/Tangerine/Tangerine.otf" allosvrs/assets/fonts/
cp "/Users/yassine/Desktop/1. DA/1. Visuels finis/1. Logo/Logo/Pastille/Pastille black.png" allosvrs/assets/logos/
cp "/Users/yassine/Desktop/1. DA/1. Visuels finis/1. Logo/Logo/Pastille/Pastille white.png" allosvrs/assets/logos/
cp "/Users/yassine/Desktop/1. DA/1. Visuels finis/1. Logo/Logo/Colors/Logo black.png" allosvrs/assets/logos/
cp "/Users/yassine/Desktop/1. DA/1. Visuels finis/1. Logo/Logo/Colors/Logo white.png" allosvrs/assets/logos/
```

**Step 2: Create `index.html` with all 5 screen sections**

The HTML contains:
- PWA meta tags (viewport, apple-mobile-web-app, theme-color)
- Font face declaration for Tangerine
- 5 `<section>` elements, one per screen, only `screen-main` has class `active`
- Screen IDs: `screen-main`, `screen-countdown`, `screen-recording`, `screen-confirmation`, `screen-setup`
- Admin panel has 3 tabs: event, appearance, videos
- All text elements have `data-i18n` attributes for translation
- Script tags for all JS files + JSZip CDN

Key HTML structure for each screen:

**screen-main:**
```html
<section id="screen-main" class="screen active">
  <div class="main-content">
    <div class="main-photo-wrapper">
      <img id="main-photo" class="main-photo" src="" alt="" hidden>
    </div>
    <div class="main-text-wrapper">
      <h1 id="main-title" class="main-title"></h1>
      <p id="main-subtitle" class="main-subtitle"></p>
    </div>
    <img id="main-logo" class="main-logo" src="" alt="" hidden>
    <button id="btn-record" class="btn-record" data-i18n="record"></button>
  </div>
</section>
```

**screen-countdown:**
```html
<section id="screen-countdown" class="screen">
  <div class="countdown-content">
    <p id="countdown-instruction" class="countdown-instruction" data-i18n="countdown_instruction"></p>
    <div id="countdown-number" class="countdown-number"></div>
  </div>
</section>
```

**screen-recording:**
```html
<section id="screen-recording" class="screen">
  <video id="recording-preview" autoplay playsinline muted></video>
  <button id="btn-stop" class="btn-stop" data-i18n="stop"></button>
</section>
```

**screen-confirmation:**
```html
<section id="screen-confirmation" class="screen">
  <div class="confirmation-content">
    <p id="confirmation-message" class="confirmation-message" data-i18n="confirmation"></p>
    <img class="confirmation-logo" src="assets/logos/Pastille white.png" alt="Allo Souvenirs">
  </div>
</section>
```

**screen-setup:** 3-tab admin panel (full HTML in implementation)

**Step 3: Create `manifest.json`**

```json
{
  "name": "Allo Souvenirs",
  "short_name": "AlloSvrs",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "assets/logos/Logo black.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Step 4: Init git repo and commit**

```bash
cd allosvrs && git init && git add -A && git commit -m "chore: project scaffolding with assets"
```

---

### Task 2: CSS Base Layout & Screen System

**Files:**
- Create: `allosvrs/css/main.css`

**Step 1: Write base CSS**

Core rules:
- `@font-face` for Tangerine (relative path `../assets/fonts/Tangerine.otf`)
- CSS reset: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`
- `html, body`: full height, overflow hidden, landscape orientation
- `.screen`: position fixed, inset 0, display none, z-index 1
- `.screen.active`: display flex, align/justify center
- CSS custom properties on `:root` for default theme (will be overridden by themes.css):
  - `--bg-color`, `--text-color`, `--btn-color`, `--btn-text-color`, `--accent-color`
- `.btn-record`: large touch target (min 80px height, 300px width), font-size 1.5rem, border-radius from theme
- `.btn-stop`: circular red button (80px), fixed bottom center
- `.main-photo`: max-width 100%, max-height 50vh, object-fit contain
- `.main-logo`: max-height 80px, positioned bottom or top depending on config
- `.main-title`: font-family Tangerine, font-size 3rem
- `.main-subtitle`: font-size 1.5rem
- `.countdown-number`: font-size 8rem, font-weight bold
- `.countdown-instruction`: font-size 1.5rem, max-width 600px, text-align center
- `#recording-preview`: full screen, object-fit cover, transform scaleX(-1) for mirror
- `.confirmation-message`: font-family Tangerine, font-size 3rem
- `.confirmation-logo`: max-height 60px, opacity 0.7

Text position classes:
- `.text-above .main-photo-wrapper`: order 2
- `.text-below .main-photo-wrapper`: order 0
- `.text-overlay .main-text-wrapper`: position absolute, z-index 2, background rgba(0,0,0,0.4), color white, padding 1rem, border-radius 8px

Admin panel styles:
- `.setup-container`: max-width 900px, padding 2rem, background white, color #333
- `.setup-tabs`: flex row, gap
- `.setup-tab`: button style, border-bottom highlight when active
- `.setup-panel`: display none; `.setup-panel.active`: display block
- Form inputs, selects, color pickers styled consistently
- `.video-list`: scrollable list with flex rows
- `.pin-screen`: centered form with large input

**Step 2: Commit**

```bash
git add css/main.css && git commit -m "style: base layout and screen system CSS"
```

---

### Task 3: Theme System

**Files:**
- Create: `allosvrs/css/themes.css`

**Step 1: Write 7 theme presets**

Each theme is a class on `<body>` that sets CSS custom properties:

```css
body.mariage-classique {
  --bg-color: #FFF8F0;
  --text-color: #5C4033;
  --btn-color: #C8A96E;
  --btn-text-color: #FFFFFF;
  --accent-color: #D4AF37;
  --btn-radius: 30px;
  --font-display: 'Tangerine', cursive;
}

body.mariage-luxe {
  --bg-color: #0A0A0A;
  --text-color: #F5F5F5;
  --btn-color: #D4AF37;
  --btn-text-color: #0A0A0A;
  --accent-color: #B8860B;
  --btn-radius: 0px;
  --font-display: 'Tangerine', cursive;
}

body.baby-shower {
  --bg-color: #FFF0F5;
  --text-color: #8B5E6B;
  --btn-color: #F4A7BB;
  --btn-text-color: #FFFFFF;
  --accent-color: #FFB6C1;
  --btn-radius: 25px;
  --font-display: 'Tangerine', cursive;
}

body.corporate {
  --bg-color: #F5F5F5;
  --text-color: #1A2A3A;
  --btn-color: #1A3A5C;
  --btn-text-color: #FFFFFF;
  --accent-color: #2C5F8A;
  --btn-radius: 6px;
  --font-display: sans-serif;
}

body.festif {
  --bg-color: #1A0A2E;
  --text-color: #F5F5F5;
  --btn-color: #E91E8C;
  --btn-text-color: #FFFFFF;
  --accent-color: #FFD700;
  --btn-radius: 30px;
  --font-display: 'Tangerine', cursive;
}

body.marque {
  --bg-color: #FFFFFF;
  --text-color: #111111;
  --btn-color: #111111;
  --btn-text-color: #FFFFFF;
  --accent-color: #333333;
  --btn-radius: 0px;
  --font-display: sans-serif;
}

body.hotellerie {
  --bg-color: #F5EFE6;
  --text-color: #3E2C1C;
  --btn-color: #8B6F4E;
  --btn-text-color: #FFFFFF;
  --accent-color: #C8A96E;
  --btn-radius: 8px;
  --font-display: 'Tangerine', cursive;
}
```

All components in main.css use `var(--bg-color)` etc. so theme swap is instant.

**Step 2: Commit**

```bash
git add css/themes.css && git commit -m "style: 7 theme presets with CSS custom properties"
```

---

### Task 4: Translation System (i18n)

**Files:**
- Create: `allosvrs/locales/fr.json`
- Create: `allosvrs/locales/en.json`
- Create: `allosvrs/locales/ar.json`
- Create: `allosvrs/js/i18n.js`

**Step 1: Create locale files**

`fr.json`:
```json
{
  "record": "Enregistrer un message",
  "countdown_instruction": "Décrochez le téléphone et attendez le bip",
  "stop": "Arrêter",
  "confirmation": "Vidéo enregistrée !",
  "returning": "Retour automatique..."
}
```

`en.json`:
```json
{
  "record": "Record a message",
  "countdown_instruction": "Pick up the phone and wait for the beep",
  "stop": "Stop",
  "confirmation": "Video recorded!",
  "returning": "Returning shortly..."
}
```

`ar.json`:
```json
{
  "record": "سجّل رسالة",
  "countdown_instruction": "ارفع السماعة وانتظر الصافرة",
  "stop": "إيقاف",
  "confirmation": "تم تسجيل الفيديو!",
  "returning": "جارٍ العودة..."
}
```

**Step 2: Create `js/i18n.js`**

```javascript
const I18n = {
    translations: {},
    currentLang: 'fr',

    async load(lang) {
        const response = await fetch(`locales/${lang}.json`);
        this.translations = await response.json();
        this.currentLang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        this.apply();
    },

    apply() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[key]) {
                el.textContent = this.translations[key];
            }
        });
    },

    get(key) {
        return this.translations[key] || key;
    }
};
```

**Step 3: Commit**

```bash
git add locales/ js/i18n.js && git commit -m "feat: i18n system with FR/EN/AR translations"
```

---

### Task 5: Config & Storage System

**Files:**
- Create: `allosvrs/js/storage.js`

**Step 1: Write Config object (localStorage)**

```javascript
const Config = {
    defaults: {
        title: 'Bienvenue',
        subtitle: '',
        textPosition: 'below',
        countdownDuration: 5,
        language: 'fr',
        theme: 'mariage-classique',
        customColors: null,
        pin: '2402'
    },

    get(key) {
        const stored = localStorage.getItem('allosvrs_config');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (key in parsed) return parsed[key];
        }
        return this.defaults[key];
    },

    set(key, value) {
        const stored = localStorage.getItem('allosvrs_config');
        const config = stored ? JSON.parse(stored) : {};
        config[key] = value;
        localStorage.setItem('allosvrs_config', JSON.stringify(config));
    },

    getAll() {
        const stored = localStorage.getItem('allosvrs_config');
        const config = stored ? JSON.parse(stored) : {};
        return { ...this.defaults, ...config };
    },

    saveAll(obj) {
        localStorage.setItem('allosvrs_config', JSON.stringify(obj));
    }
};
```

**Step 2: Write VideoStorage object (IndexedDB)**

```javascript
const VideoStorage = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AlloSouvenirsDB', 2);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'key' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async saveVideo(blob) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const filename = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}.mp4`;
        const record = { blob, filename, timestamp: now.toISOString() };

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('videos', 'readwrite');
            const store = tx.objectStore('videos');
            const req = store.add(record);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async getAllVideos() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('videos', 'readonly');
            const store = tx.objectStore('videos');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async deleteVideo(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('videos', 'readwrite');
            const store = tx.objectStore('videos');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async clearAllVideos() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('videos', 'readwrite');
            const store = tx.objectStore('videos');
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async videoCount() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('videos', 'readonly');
            const store = tx.objectStore('videos');
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async saveImage(key, blob) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            const req = store.put({ key, blob });
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async getImage(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('images', 'readonly');
            const store = tx.objectStore('images');
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.blob : null);
            req.onerror = (e) => reject(e.target.error);
        });
    },

    async deleteImage(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    }
};
```

Key improvement over old version: images stored as blobs in IndexedDB instead of data URLs in localStorage (no 5MB overflow risk).

**Step 3: Commit**

```bash
git add js/storage.js && git commit -m "feat: config (localStorage) and video/image storage (IndexedDB)"
```

---

### Task 6: Screen Navigation & App Init

**Files:**
- Create: `allosvrs/js/app.js`

**Step 1: Write screen navigation and app initialization**

```javascript
const App = {
    screens: {},
    currentScreen: 'main',
    wakeLock: null,

    async init() {
        // Cache screen elements
        document.querySelectorAll('.screen').forEach(s => {
            this.screens[s.id.replace('screen-', '')] = s;
        });

        // Init storage
        await VideoStorage.init();

        // Load config
        const config = Config.getAll();

        // Apply theme
        this.applyTheme(config.theme, config.customColors);

        // Load language
        await I18n.load(config.language);

        // Apply event config to main screen
        this.applyMainScreen(config);

        // Request wake lock (keep screen on)
        this.requestWakeLock();

        // Route: check for #setup hash
        if (window.location.hash === '#setup') {
            this.showScreen('setup');
        }

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            if (window.location.hash === '#setup') {
                this.showScreen('setup');
            }
        });

        // Button listeners
        document.getElementById('btn-record').addEventListener('click', () => this.startCountdown());
        document.getElementById('btn-stop').addEventListener('click', () => Camera.stopRecording());
    },

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        if (this.screens[name]) {
            this.screens[name].classList.add('active');
            this.currentScreen = name;
        }
    },

    applyTheme(theme, customColors) {
        // Remove all theme classes
        document.body.className = '';
        // Apply theme preset
        document.body.classList.add(theme);
        // Override with custom colors if set
        if (customColors) {
            const root = document.documentElement;
            if (customColors.bgColor) root.style.setProperty('--bg-color', customColors.bgColor);
            if (customColors.textColor) root.style.setProperty('--text-color', customColors.textColor);
            if (customColors.btnColor) root.style.setProperty('--btn-color', customColors.btnColor);
            if (customColors.accentColor) root.style.setProperty('--accent-color', customColors.accentColor);
        }
    },

    async applyMainScreen(config) {
        // Title & subtitle
        document.getElementById('main-title').textContent = config.title || '';
        document.getElementById('main-subtitle').textContent = config.subtitle || '';

        // Text position
        const mainContent = document.querySelector('.main-content');
        mainContent.classList.remove('text-above', 'text-below', 'text-overlay');
        mainContent.classList.add('text-' + (config.textPosition || 'below'));

        // Photo
        const photoEl = document.getElementById('main-photo');
        const photoBlob = await VideoStorage.getImage('event-photo');
        if (photoBlob) {
            photoEl.src = URL.createObjectURL(photoBlob);
            photoEl.hidden = false;
        } else {
            photoEl.hidden = true;
        }

        // Logo
        const logoEl = document.getElementById('main-logo');
        const logoBlob = await VideoStorage.getImage('event-logo');
        if (logoBlob) {
            logoEl.src = URL.createObjectURL(logoBlob);
            logoEl.hidden = false;
        } else {
            logoEl.hidden = true;
        }
    },

    async startCountdown() {
        const duration = Config.get('countdownDuration');
        this.showScreen('countdown');
        const numberEl = document.getElementById('countdown-number');
        let remaining = duration;
        numberEl.textContent = remaining;

        await new Promise(resolve => {
            const interval = setInterval(() => {
                remaining--;
                numberEl.textContent = remaining;
                if (remaining <= 0) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });

        // Play beep sound
        this.playBeep();

        // Start recording
        this.showScreen('recording');
        await Camera.startRecording();
    },

    playBeep() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        gain.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, 300);
    },

    async onRecordingComplete(blob) {
        await VideoStorage.saveVideo(blob);
        this.showScreen('confirmation');
        setTimeout(() => {
            this.showScreen('main');
        }, 3000);
    },

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (e) {
            // Wake lock not supported or denied - continue without it
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
```

**Step 2: Commit**

```bash
git add js/app.js && git commit -m "feat: screen navigation, countdown, wake lock, theme application"
```

---

### Task 7: Camera & Recording

**Files:**
- Create: `allosvrs/js/camera.js`

**Step 1: Write Camera module**

```javascript
const Camera = {
    stream: null,
    recorder: null,
    chunks: [],

    async startRecording() {
        const preview = document.getElementById('recording-preview');

        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: true
        });

        preview.srcObject = this.stream;
        this.chunks = [];

        // Use mp4 if supported, otherwise webm
        const mimeType = MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : 'video/webm;codecs=vp8,opus';

        this.recorder = new MediaRecorder(this.stream, { mimeType });

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };

        this.recorder.onstop = () => {
            const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
            this.cleanup();
            App.onRecordingComplete(blob);
        };

        this.recorder.start(1000); // collect data every second
    },

    stopRecording() {
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    },

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        const preview = document.getElementById('recording-preview');
        preview.srcObject = null;
    }
};
```

**Step 2: Commit**

```bash
git add js/camera.js && git commit -m "feat: camera recording with 1080p 30fps front camera"
```

---

### Task 8: Admin Panel - PIN & Tabs

**Files:**
- Modify: `allosvrs/js/admin.js`

**Step 1: Write Admin module - PIN verification and tab switching**

```javascript
const Admin = {
    init() {
        // PIN form
        document.getElementById('pin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.checkPin();
        });

        // Tab switching
        document.querySelectorAll('.setup-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    },

    checkPin() {
        const input = document.getElementById('pin-input').value;
        const pin = Config.get('pin');
        if (input === pin) {
            document.getElementById('pin-screen').hidden = true;
            document.getElementById('admin-panel').hidden = false;
            this.loadEventConfig();
            this.loadAppearanceConfig();
            this.loadVideoList();
        } else {
            document.getElementById('pin-error').textContent = 'Code incorrect';
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`panel-${tabName}`).classList.add('active');
    }
};
```

**Step 2: Commit**

```bash
git add js/admin.js && git commit -m "feat: admin PIN verification and tab switching"
```

---

### Task 9: Admin - Event Config Tab

**Files:**
- Modify: `allosvrs/js/admin.js`

**Step 1: Add event config load/save to Admin**

Add to Admin object:

```javascript
    loadEventConfig() {
        const config = Config.getAll();
        document.getElementById('cfg-title').value = config.title || '';
        document.getElementById('cfg-subtitle').value = config.subtitle || '';
        document.getElementById('cfg-text-position').value = config.textPosition || 'below';
        document.getElementById('cfg-countdown').value = config.countdownDuration || 5;
        document.getElementById('cfg-language').value = config.language || 'fr';

        // Load image previews from IndexedDB
        this.loadImagePreview('event-photo', 'preview-photo');
        this.loadImagePreview('event-logo', 'preview-logo');
    },

    async loadImagePreview(key, previewId) {
        const blob = await VideoStorage.getImage(key);
        const el = document.getElementById(previewId);
        if (blob) {
            el.src = URL.createObjectURL(blob);
            el.hidden = false;
        } else {
            el.hidden = true;
        }
    },

    setupFileUpload(inputId, imageKey, previewId) {
        document.getElementById(inputId).addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            await VideoStorage.saveImage(imageKey, file);
            this.loadImagePreview(imageKey, previewId);
        });
    },

    async saveEventConfig() {
        const config = Config.getAll();
        config.title = document.getElementById('cfg-title').value;
        config.subtitle = document.getElementById('cfg-subtitle').value;
        config.textPosition = document.getElementById('cfg-text-position').value;
        config.countdownDuration = parseInt(document.getElementById('cfg-countdown').value);
        config.language = document.getElementById('cfg-language').value;
        Config.saveAll(config);

        // Refresh main screen
        await I18n.load(config.language);
        App.applyMainScreen(config);
        document.getElementById('save-event-feedback').textContent = 'Sauvegardé !';
        setTimeout(() => document.getElementById('save-event-feedback').textContent = '', 2000);
    },

    previewEvent() {
        // Save current config and show main screen briefly
        this.saveEventConfig();
        App.showScreen('main');
        setTimeout(() => App.showScreen('setup'), 5000);
    },
```

Wire up file uploads in `init()`:
```javascript
    this.setupFileUpload('cfg-photo', 'event-photo', 'preview-photo');
    this.setupFileUpload('cfg-logo', 'event-logo', 'preview-logo');
    document.getElementById('btn-save-event').addEventListener('click', () => this.saveEventConfig());
    document.getElementById('btn-preview').addEventListener('click', () => this.previewEvent());
```

**Step 2: Commit**

```bash
git add js/admin.js && git commit -m "feat: admin event config tab with image uploads"
```

---

### Task 10: Admin - Appearance Tab

**Files:**
- Modify: `allosvrs/js/admin.js`

**Step 1: Add appearance config to Admin**

```javascript
    loadAppearanceConfig() {
        const config = Config.getAll();
        document.getElementById('cfg-theme').value = config.theme || 'mariage-classique';

        const colors = config.customColors || {};
        document.getElementById('cfg-bg-color').value = colors.bgColor || this.getComputedThemeColor('--bg-color');
        document.getElementById('cfg-text-color').value = colors.textColor || this.getComputedThemeColor('--text-color');
        document.getElementById('cfg-btn-color').value = colors.btnColor || this.getComputedThemeColor('--btn-color');
        document.getElementById('cfg-accent-color').value = colors.accentColor || this.getComputedThemeColor('--accent-color');
    },

    getComputedThemeColor(prop) {
        return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    },

    saveAppearanceConfig() {
        const config = Config.getAll();
        config.theme = document.getElementById('cfg-theme').value;
        config.customColors = {
            bgColor: document.getElementById('cfg-bg-color').value,
            textColor: document.getElementById('cfg-text-color').value,
            btnColor: document.getElementById('cfg-btn-color').value,
            accentColor: document.getElementById('cfg-accent-color').value
        };
        Config.saveAll(config);
        App.applyTheme(config.theme, config.customColors);
        document.getElementById('save-appearance-feedback').textContent = 'Sauvegardé !';
        setTimeout(() => document.getElementById('save-appearance-feedback').textContent = '', 2000);
    },
```

Theme select change resets color pickers to theme defaults:
```javascript
    onThemeChange() {
        const theme = document.getElementById('cfg-theme').value;
        // Temporarily apply theme to read its defaults
        document.body.className = theme;
        document.documentElement.style.removeProperty('--bg-color');
        document.documentElement.style.removeProperty('--text-color');
        document.documentElement.style.removeProperty('--btn-color');
        document.documentElement.style.removeProperty('--accent-color');

        // Read computed values
        setTimeout(() => {
            document.getElementById('cfg-bg-color').value = this.getComputedThemeColor('--bg-color');
            document.getElementById('cfg-text-color').value = this.getComputedThemeColor('--text-color');
            document.getElementById('cfg-btn-color').value = this.getComputedThemeColor('--btn-color');
            document.getElementById('cfg-accent-color').value = this.getComputedThemeColor('--accent-color');
        }, 50);
    },
```

Wire in `init()`:
```javascript
    document.getElementById('cfg-theme').addEventListener('change', () => this.onThemeChange());
    document.getElementById('btn-save-appearance').addEventListener('click', () => this.saveAppearanceConfig());
```

**Step 2: Commit**

```bash
git add js/admin.js && git commit -m "feat: admin appearance tab with theme and custom colors"
```

---

### Task 11: Admin - Videos Tab

**Files:**
- Modify: `allosvrs/js/admin.js`

**Step 1: Add video management to Admin**

```javascript
    async loadVideoList() {
        const videos = await VideoStorage.getAllVideos();
        const list = document.getElementById('video-list');
        const count = document.getElementById('video-count');
        count.textContent = `${videos.length} vidéo(s)`;
        list.innerHTML = '';

        if (videos.length === 0) {
            list.innerHTML = '<p class="no-videos">Aucune vidéo enregistrée</p>';
            return;
        }

        videos.forEach(video => {
            const row = document.createElement('div');
            row.className = 'video-row';

            const info = document.createElement('span');
            info.textContent = video.filename;

            const actions = document.createElement('div');
            actions.className = 'video-actions';

            const dlBtn = document.createElement('button');
            dlBtn.textContent = 'Télécharger';
            dlBtn.className = 'btn-small';
            dlBtn.addEventListener('click', () => this.downloadVideo(video));

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Supprimer';
            delBtn.className = 'btn-small btn-danger';
            delBtn.addEventListener('click', () => this.deleteSingleVideo(video.id));

            actions.appendChild(dlBtn);
            actions.appendChild(delBtn);
            row.appendChild(info);
            row.appendChild(actions);
            list.appendChild(row);
        });
    },

    downloadVideo(video) {
        const url = URL.createObjectURL(video.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = video.filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    async downloadAllZip() {
        const videos = await VideoStorage.getAllVideos();
        if (videos.length === 0) return;

        document.getElementById('export-progress').textContent = 'Préparation du ZIP...';
        const zip = new JSZip();
        videos.forEach(v => zip.file(v.filename, v.blob));
        const content = await zip.generateAsync({ type: 'blob' });

        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'allo-souvenirs-videos.zip';
        a.click();
        URL.revokeObjectURL(url);
        document.getElementById('export-progress').textContent = '';
    },

    async deleteSingleVideo(id) {
        if (!confirm('Supprimer cette vidéo ?')) return;
        await VideoStorage.deleteVideo(id);
        this.loadVideoList();
    },

    async deleteAllVideos() {
        if (!confirm('Supprimer TOUTES les vidéos ? Cette action est irréversible.')) return;
        await VideoStorage.clearAllVideos();
        this.loadVideoList();
    },
```

Wire in `init()`:
```javascript
    document.getElementById('btn-download-all').addEventListener('click', () => this.downloadAllZip());
    document.getElementById('btn-delete-all').addEventListener('click', () => this.deleteAllVideos());
```

**Step 2: Commit**

```bash
git add js/admin.js && git commit -m "feat: admin videos tab with download, ZIP export, delete"
```

---

### Task 12: Service Worker & PWA

**Files:**
- Create: `allosvrs/sw.js`

**Step 1: Write service worker**

```javascript
const CACHE_NAME = 'allosvrs-v1';
const ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/themes.css',
    './js/app.js',
    './js/camera.js',
    './js/storage.js',
    './js/i18n.js',
    './js/admin.js',
    './locales/fr.json',
    './locales/en.json',
    './locales/ar.json',
    './assets/fonts/Tangerine.otf',
    './assets/logos/Pastille black.png',
    './assets/logos/Pastille white.png',
    './assets/logos/Logo black.png',
    './assets/logos/Logo white.png',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
```

**Step 2: Register service worker in index.html**

At the bottom of index.html before closing `</body>`:
```html
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}
</script>
```

**Step 3: Commit**

```bash
git add sw.js && git commit -m "feat: service worker for offline PWA support"
```

---

### Task 13: Integration & Polish

**Files:**
- Modify: `allosvrs/index.html` (finalize all wiring)
- Modify: `allosvrs/css/main.css` (polish)

**Step 1: Ensure all JS loads in correct order in index.html**

```html
<script src="js/storage.js"></script>
<script src="js/i18n.js"></script>
<script src="js/camera.js"></script>
<script src="js/admin.js"></script>
<script src="js/app.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

**Step 2: Test full flow in browser**

Run local server:
```bash
cd allosvrs && python3 -m http.server 8000
```

Test checklist:
- [ ] Main screen displays with default theme
- [ ] Click "Enregistrer" → countdown starts
- [ ] Countdown reaches 0 → beep plays → camera starts
- [ ] Click Stop → video saves → confirmation shows 3s → returns to main
- [ ] Navigate to `#setup` → PIN screen shows
- [ ] Enter 2402 → admin panel opens
- [ ] Event tab: change title, upload photo/logo, save → main screen updates
- [ ] Appearance tab: change theme → colors update → custom colors work
- [ ] Videos tab: videos listed → download works → ZIP works → delete works
- [ ] Change language to EN → texts update
- [ ] Change language to AR → RTL applies
- [ ] Preview button shows main screen for 5s

**Step 3: Fix any issues found during testing**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: integration and polish - complete app"
```

---

### Task 14: GitHub Pages Deployment

**Step 1: Create GitHub repo**

```bash
cd allosvrs
gh repo create allosvrs --public --source=. --push
```

**Step 2: Enable GitHub Pages**

```bash
gh api repos/{owner}/allosvrs/pages -X POST -f source.branch=main -f source.path=/
```

**Step 3: Verify deployment**

Open `https://<username>.github.io/allosvrs/` and test on iPad Safari.

**Step 4: Commit any deployment fixes**

```bash
git add -A && git commit -m "fix: deployment adjustments for GitHub Pages"
```
