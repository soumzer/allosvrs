// Admin module - Tasks 8-11: PIN verification, tab switching, event config, appearance, video management

const Admin = {
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // PIN form
        document.getElementById('pin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.checkPin();
        });

        // Tab switching
        document.querySelectorAll('.setup-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // File uploads
        this.setupFileUpload('cfg-photo', 'event-photo', 'preview-photo');
        this.setupFileUpload('cfg-logo', 'event-logo', 'preview-logo');

        // Event buttons
        document.getElementById('btn-save-event').addEventListener('click', () => this.saveEventConfig());
        document.getElementById('btn-preview').addEventListener('click', () => this.previewEvent());

        // Appearance
        document.getElementById('cfg-theme').addEventListener('change', () => this.onThemeChange());
        document.getElementById('btn-save-appearance').addEventListener('click', () => this.saveAppearanceConfig());

        // Videos
        document.getElementById('btn-download-all').addEventListener('click', () => this.downloadAllZip());
        document.getElementById('btn-delete-all').addEventListener('click', () => this.deleteAllVideos());
    },

    // --- PIN ---

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
            document.getElementById('pin-input').value = '';
        }
    },

    // --- TABS ---

    switchTab(tabName) {
        document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.setup-panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`panel-${tabName}`).classList.add('active');
    },

    // --- EVENT CONFIG ---

    loadEventConfig() {
        const config = Config.getAll();
        document.getElementById('cfg-title').value = config.title || '';
        document.getElementById('cfg-subtitle').value = config.subtitle || '';
        document.getElementById('cfg-text-position').value = config.textPosition || 'below';
        document.getElementById('cfg-countdown').value = config.countdownDuration || 5;
        document.getElementById('cfg-language').value = config.language || 'fr';

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

        await I18n.load(config.language);
        await App.applyMainScreen(config);

        document.getElementById('save-event-feedback').textContent = 'Sauvegardé !';
        setTimeout(() => {
            document.getElementById('save-event-feedback').textContent = '';
        }, 2000);
    },

    async previewEvent() {
        await this.saveEventConfig();
        App.showScreen('main');
        setTimeout(() => {
            App.showScreen('setup');
        }, 5000);
    },

    // --- APPEARANCE ---

    loadAppearanceConfig() {
        const config = Config.getAll();
        document.getElementById('cfg-theme').value = config.theme || 'mariage-classique';

        // Apply the theme first so we can read computed values
        App.applyTheme(config.theme, config.customColors);

        // If custom colors exist, use them; otherwise read from theme
        if (config.customColors) {
            document.getElementById('cfg-bg-color').value = config.customColors.bgColor || this.getThemeColor('--bg-color');
            document.getElementById('cfg-text-color').value = config.customColors.textColor || this.getThemeColor('--text-color');
            document.getElementById('cfg-btn-color').value = config.customColors.btnColor || this.getThemeColor('--btn-color');
            document.getElementById('cfg-accent-color').value = config.customColors.accentColor || this.getThemeColor('--accent-color');
        } else {
            this.syncColorPickersToTheme();
        }
    },

    getThemeColor(prop) {
        return getComputedStyle(document.body).getPropertyValue(prop).trim();
    },

    rgbToHex(rgb) {
        // Convert "rgb(r, g, b)" or hex to hex
        if (rgb.startsWith('#')) return rgb;
        const match = rgb.match(/\d+/g);
        if (!match) return '#000000';
        return '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    },

    syncColorPickersToTheme() {
        const bgRaw = this.getThemeColor('--bg-color');
        const textRaw = this.getThemeColor('--text-color');
        const btnRaw = this.getThemeColor('--btn-color');
        const accentRaw = this.getThemeColor('--accent-color');

        document.getElementById('cfg-bg-color').value = this.rgbToHex(bgRaw);
        document.getElementById('cfg-text-color').value = this.rgbToHex(textRaw);
        document.getElementById('cfg-btn-color').value = this.rgbToHex(btnRaw);
        document.getElementById('cfg-accent-color').value = this.rgbToHex(accentRaw);
    },

    onThemeChange() {
        const theme = document.getElementById('cfg-theme').value;
        // Apply theme without custom colors to read defaults
        App.applyTheme(theme, null);
        // Wait for styles to apply, then read computed values
        requestAnimationFrame(() => {
            this.syncColorPickersToTheme();
        });
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
        setTimeout(() => {
            document.getElementById('save-appearance-feedback').textContent = '';
        }, 2000);
    },

    // --- VIDEOS ---

    async loadVideoList() {
        const videos = await VideoStorage.getAllVideos();
        const list = document.getElementById('video-list');
        const count = document.getElementById('video-count');
        count.textContent = videos.length + ' vidéo(s)';
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

        const progress = document.getElementById('export-progress');
        progress.textContent = 'Préparation du ZIP...';

        try {
            const zip = new JSZip();
            videos.forEach(v => {
                zip.file(v.filename, v.blob);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'allo-souvenirs-videos.zip';
            a.click();
            URL.revokeObjectURL(url);
            progress.textContent = 'ZIP téléchargé !';
        } catch (e) {
            console.error('ZIP error:', e);
            progress.textContent = 'Erreur lors de la création du ZIP';
        }

        setTimeout(() => { progress.textContent = ''; }, 3000);
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
    }
};
