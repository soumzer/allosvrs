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

        // Block context menu (right-click / long-press) on main photo
        document.getElementById('main-photo').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

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
        document.getElementById('btn-consent-yes').addEventListener('click', () => this._onConsentChoice(true));
        document.getElementById('btn-consent-no').addEventListener('click', () => this._onConsentChoice(false));
        document.getElementById('btn-consent-learn-more').addEventListener('click', () => this._openFaq());
        document.getElementById('btn-faq-back').addEventListener('click', () => this._closeFaq());
        document.getElementById('btn-faq-close').addEventListener('click', () => this._closeFaq());
        // Any tap inside the FAQ modal resets its inactivity timer
        document.getElementById('faq-modal').addEventListener('click', () => this._resetFaqTimerIfOpen());
        document.getElementById('btn-pin-back').addEventListener('click', () => {
            window.location.hash = '';
            this.showScreen('main');
        });

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
        // Apply button position (object format) as inline styles on #btn-record
        const btn = document.getElementById('btn-record');
        const pos = config.buttonPosition;
        btn.style.left = (pos.x - pos.width / 2) + '%';
        btn.style.top = (pos.y - pos.height / 2) + '%';
        btn.style.width = pos.width + '%';
        btn.style.height = pos.height + '%';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
        btn.style.transform = 'none';

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
            this.cleanupAudio();
            window.location.reload();
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
        this._pendingBlob = blob;
        this._showConsentScreen();
    },

    _showConsentScreen() {
        // Two distinct keys avoid bad grammar with fallback ("à les organisateurs" → "aux organisateurs")
        const host = Config.get('hostNames');
        const noteEl = document.getElementById('consent-host-note');
        if (host) {
            // Wrap host (likely Latin) with LRI/PDI so it stays LTR inside RTL locales
            noteEl.textContent = I18n.get('consent_host_note_with').replace('{host}', '⁦' + host + '⁩');
        } else {
            noteEl.textContent = I18n.get('consent_host_note_fallback');
        }

        this.showScreen('consent');
        this._startConsentTimer();
    },

    async _onConsentChoice(promoAuthorized) {
        this._stopConsentTimer();
        this._stopFaqTimer();
        if (!this._pendingBlob) return; // already saved (e.g. by timeout race)

        await VideoStorage.saveVideo(this._pendingBlob, promoAuthorized);
        this._pendingBlob = null;

        this.showScreen('confirmation');
        setTimeout(() => {
            this.showScreen('main');
        }, 5000);
    },

    _openFaq() {
        this._stopConsentTimer();
        document.getElementById('faq-modal').hidden = false;
        this._startFaqTimer();
    },

    _closeFaq() {
        this._stopFaqTimer();
        document.getElementById('faq-modal').hidden = true;
        // If still in consent flow, give a fresh 30s to decide
        if (this._pendingBlob) {
            this._startConsentTimer();
        }
    },

    // ===== TIMERS (consent + FAQ inactivity) =====
    // Consent: 30s idle → auto-save as No + back to main
    // FAQ:     60s idle → auto-close → consent screen with fresh 30s
    // Last 10s of each: discreet "Returning..." hint visible

    _startConsentTimer() {
        this._stopConsentTimer();
        const noteEl = document.getElementById('consent-returning-note');
        this._consentHintId = setTimeout(() => { noteEl.hidden = false; }, 20 * 1000);
        this._consentTimeoutId = setTimeout(() => {
            // Auto-decline: save with promoAuthorized=false, return main
            this._onConsentChoice(false);
        }, 30 * 1000);
    },

    _stopConsentTimer() {
        if (this._consentHintId) { clearTimeout(this._consentHintId); this._consentHintId = null; }
        if (this._consentTimeoutId) { clearTimeout(this._consentTimeoutId); this._consentTimeoutId = null; }
        const noteEl = document.getElementById('consent-returning-note');
        if (noteEl) noteEl.hidden = true;
    },

    _startFaqTimer() {
        this._stopFaqTimer();
        const noteEl = document.getElementById('faq-returning-note');
        this._faqHintId = setTimeout(() => { noteEl.hidden = false; }, 50 * 1000);
        this._faqTimeoutId = setTimeout(() => {
            // Inactivity in FAQ → close FAQ, _closeFaq restarts consent timer
            this._closeFaq();
        }, 60 * 1000);
    },

    _stopFaqTimer() {
        if (this._faqHintId) { clearTimeout(this._faqHintId); this._faqHintId = null; }
        if (this._faqTimeoutId) { clearTimeout(this._faqTimeoutId); this._faqTimeoutId = null; }
        const noteEl = document.getElementById('faq-returning-note');
        if (noteEl) noteEl.hidden = true;
    },

    _resetFaqTimerIfOpen() {
        const modal = document.getElementById('faq-modal');
        if (modal && !modal.hidden) this._startFaqTimer();
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
