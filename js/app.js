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

        // Load config and apply
        const config = Config.getAll();
        this.applyTheme(config.theme, config.customColors);
        await I18n.load(config.language);
        await this.applyMainScreen(config);

        // Keep screen on
        this.requestWakeLock();

        // Block iOS elastic scroll (overscroll-behavior not enough on iOS Safari)
        document.addEventListener('touchmove', (e) => {
            if (!e.target.closest('.admin-panel')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Check for #setup hash
        if (window.location.hash === '#setup') {
            this.showScreen('setup');
            Admin.init();
        }

        // Hash change listener
        window.addEventListener('hashchange', () => {
            if (window.location.hash === '#setup') {
                this.showScreen('setup');
                Admin.init();
            } else {
                this.showScreen('main');
            }
        });

        // Button listeners
        document.getElementById('btn-record').addEventListener('click', () => this.startCountdown());
        document.getElementById('btn-stop').addEventListener('click', () => Camera.stopRecording());

        // 5-tap secret admin access on main screen
        this._tapCount = 0;
        this._tapTimer = null;
        document.getElementById('screen-main').addEventListener('click', (e) => {
            if (e.target.closest('.btn-record')) return;
            this._tapCount++;
            if (this._tapTimer) clearTimeout(this._tapTimer);
            this._tapTimer = setTimeout(() => { this._tapCount = 0; }, 2000);
            if (this._tapCount >= 5) {
                this._tapCount = 0;
                clearTimeout(this._tapTimer);
                window.location.hash = '#setup';
            }
        });

        // Back to main from admin
        document.getElementById('btn-back-main').addEventListener('click', async () => {
            window.location.hash = '';
            // Reset admin panel state so PIN is required next time
            document.getElementById('pin-screen').hidden = false;
            document.getElementById('admin-panel').hidden = true;
            document.getElementById('pin-input').value = '';
            document.getElementById('pin-error').textContent = '';
            this.showScreen('main');
            // Refresh main screen in case config changed
            const updatedConfig = Config.getAll();
            this.applyTheme(updatedConfig.theme, updatedConfig.customColors);
            await this.applyMainScreen(updatedConfig);
            await I18n.load(updatedConfig.language);
        });
    },

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        if (this.screens[name]) {
            this.screens[name].classList.add('active');
            this.currentScreen = name;
        }
    },

    applyTheme(theme, customColors) {
        // Remove all theme classes from body
        document.body.className = '';
        document.body.classList.add(theme);

        // Clear any inline custom property overrides on body
        document.body.style.removeProperty('--bg-color');
        document.body.style.removeProperty('--text-color');
        document.body.style.removeProperty('--btn-color');
        document.body.style.removeProperty('--accent-color');

        // Override with custom colors on body (same element as theme CSS)
        if (customColors) {
            if (customColors.bgColor) document.body.style.setProperty('--bg-color', customColors.bgColor);
            if (customColors.textColor) document.body.style.setProperty('--text-color', customColors.textColor);
            if (customColors.btnColor) document.body.style.setProperty('--btn-color', customColors.btnColor);
            if (customColors.accentColor) document.body.style.setProperty('--accent-color', customColors.accentColor);
        }
    },

    async applyMainScreen(config) {
        // Button position
        const mainContent = document.querySelector('.main-content');
        const positions = ['top-left','top-center','top-right','middle-left','middle-center','middle-right','bottom-left','bottom-center','bottom-right'];
        positions.forEach(p => mainContent.classList.remove('btn-pos-' + p));
        mainContent.classList.add('btn-pos-' + (config.buttonPosition || 'bottom-center'));

        // Design photo from IndexedDB
        const photoEl = document.getElementById('main-photo');
        const photoBlob = await VideoStorage.getImage('event-photo');
        if (photoBlob) {
            photoEl.src = URL.createObjectURL(photoBlob);
            photoEl.hidden = false;
        } else {
            photoEl.hidden = true;
        }
    },

    async startCountdown() {
        // Unlock audio context immediately on user gesture (iOS requires this)
        if (Config.get('beep') !== 'off') {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Check camera permission BEFORE countdown
        try {
            const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            testStream.getTracks().forEach(t => t.stop());
        } catch (e) {
            console.error('Camera permission denied:', e);
            this.cleanupAudio();
            window.location.reload();
            return;
        }

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

        // Show recording screen first (black bg), then start camera
        this.showScreen('recording');
        try {
            await Camera.startRecording();
        } catch (e) {
            console.error('Camera error:', e);
            this.showScreen('main');
        }
    },

    playBeep() {
        try {
            const ctx = this._audioCtx;
            if (!ctx) return;
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.frequency.value = 800;
            gain.gain.value = 0.3;
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.3);
        } catch (e) {
            // Audio not supported - continue without beep
        }
    },

    cleanupAudio() {
        if (this._audioCtx) {
            this._audioCtx.close();
            this._audioCtx = null;
        }
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
                this.wakeLock.addEventListener('release', () => {
                    this.wakeLock = null;
                });
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState === 'visible' && !this.wakeLock) {
                        try {
                            this.wakeLock = await navigator.wakeLock.request('screen');
                            this.wakeLock.addEventListener('release', () => {
                                this.wakeLock = null;
                            });
                        } catch (e) { /* ignore */ }
                    }
                });
            }
        } catch (e) {
            // Wake lock not supported or denied
        }
    }
};

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
