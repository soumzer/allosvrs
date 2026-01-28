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

        // Clear any inline custom property overrides first
        const root = document.documentElement;
        root.style.removeProperty('--bg-color');
        root.style.removeProperty('--text-color');
        root.style.removeProperty('--btn-color');
        root.style.removeProperty('--accent-color');

        // Override with custom colors if set
        if (customColors) {
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

        // Photo from IndexedDB
        const photoEl = document.getElementById('main-photo');
        const photoBlob = await VideoStorage.getImage('event-photo');
        if (photoBlob) {
            photoEl.src = URL.createObjectURL(photoBlob);
            photoEl.hidden = false;
        } else {
            photoEl.hidden = true;
        }

        // Logo from IndexedDB
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
                if (remaining <= 0) {
                    clearInterval(interval);
                    resolve();
                } else {
                    numberEl.textContent = remaining;
                }
            }, 1000);
        });

        // Play beep at end of countdown
        this.playBeep();

        // Start recording
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
        } catch (e) {
            // Audio not supported - continue without beep
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
                // Re-acquire wake lock on visibility change
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState === 'visible' && !this.wakeLock) {
                        this.wakeLock = await navigator.wakeLock.request('screen');
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
