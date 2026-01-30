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

        // Delete photo button
        document.getElementById('btn-delete-photo').addEventListener('click', async () => {
            await VideoStorage.deleteImage('event-photo');
            document.getElementById('preview-photo').hidden = true;
            document.getElementById('btn-delete-photo').hidden = true;
            document.getElementById('cfg-photo').value = '';
        });

        // Button position grid
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
            });
        });

        // Event buttons
        document.getElementById('btn-save-event').addEventListener('click', () => this.saveEventConfig());
        document.getElementById('btn-preview').addEventListener('click', () => this.previewEvent());

        // Appearance
        document.getElementById('cfg-theme').addEventListener('change', () => this.onThemeChange());
        document.getElementById('btn-save-appearance').addEventListener('click', () => this.saveAppearanceConfig());
        document.getElementById('btn-extract-colors').addEventListener('click', () => this.extractColorsFromPhoto());

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
        document.getElementById('cfg-countdown').value = config.countdownDuration || 5;
        document.getElementById('cfg-max-recording').value = config.maxRecording || 600;
        document.getElementById('cfg-beep').value = config.beep || 'on';
        document.getElementById('cfg-language').value = config.language || 'fr';

        // Button position grid
        const btnPos = config.buttonPosition || 'bottom-center';
        document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('active'));
        const activeCell = document.querySelector(`.grid-cell[data-pos="${btnPos}"]`);
        if (activeCell) activeCell.classList.add('active');

        this.loadImagePreview('event-photo', 'preview-photo', 'btn-delete-photo');
    },

    async loadImagePreview(key, previewId, deleteBtnId) {
        const blob = await VideoStorage.getImage(key);
        const el = document.getElementById(previewId);
        const delBtn = deleteBtnId ? document.getElementById(deleteBtnId) : null;
        if (blob) {
            el.src = URL.createObjectURL(blob);
            el.hidden = false;
            if (delBtn) delBtn.hidden = false;
        } else {
            el.hidden = true;
            if (delBtn) delBtn.hidden = true;
        }
    },

    setupFileUpload(inputId, imageKey, previewId) {
        document.getElementById(inputId).addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const resized = await this.resizeImage(file, 1920);
            await VideoStorage.saveImage(imageKey, resized);
            this.loadImagePreview(imageKey, previewId, imageKey === 'event-photo' ? 'btn-delete-photo' : null);
        });
    },

    resizeImage(file, maxDim) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                // No resize needed if already small enough
                if (w <= maxDim && h <= maxDim) {
                    URL.revokeObjectURL(img.src);
                    resolve(file);
                    return;
                }
                const scale = maxDim / Math.max(w, h);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(img.src);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
            };
            img.src = URL.createObjectURL(file);
        });
    },

    async saveEventConfig() {
        const config = Config.getAll();
        config.countdownDuration = parseInt(document.getElementById('cfg-countdown').value);
        config.maxRecording = parseInt(document.getElementById('cfg-max-recording').value);
        config.beep = document.getElementById('cfg-beep').value;
        const activeCell = document.querySelector('.grid-cell.active');
        config.buttonPosition = activeCell ? activeCell.dataset.pos : 'bottom-center';
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

    async extractColorsFromPhoto() {
        const feedback = document.getElementById('extract-colors-feedback');
        const blob = await VideoStorage.getImage('event-photo');
        if (!blob) {
            feedback.textContent = 'Aucune photo uploadée';
            setTimeout(() => { feedback.textContent = ''; }, 2000);
            return;
        }

        feedback.textContent = 'Analyse en cours...';

        const colors = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 50;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                URL.revokeObjectURL(img.src);

                const data = ctx.getImageData(0, 0, size, size).data;
                const colorMap = {};

                // Quantize pixels into buckets and count
                for (let i = 0; i < data.length; i += 4) {
                    const r = Math.round(data[i] / 32) * 32;
                    const g = Math.round(data[i + 1] / 32) * 32;
                    const b = Math.round(data[i + 2] / 32) * 32;
                    const key = `${r},${g},${b}`;
                    colorMap[key] = (colorMap[key] || 0) + 1;
                }

                // Sort by frequency
                const sorted = Object.entries(colorMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key]) => {
                        const [r, g, b] = key.split(',').map(Number);
                        return { r, g, b, lum: 0.299 * r + 0.587 * g + 0.114 * b };
                    });

                // Pick distinct colors (min distance 60)
                const palette = [];
                for (const c of sorted) {
                    if (palette.every(p => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) > 60)) {
                        palette.push(c);
                    }
                    if (palette.length >= 5) break;
                }

                const toHex = ({ r, g, b }) => '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');

                // bg = most frequent color
                const bg = palette[0];

                // text = most contrast to bg (furthest luminance)
                const rest = palette.slice(1);
                rest.sort((a, b) => Math.abs(b.lum - bg.lum) - Math.abs(a.lum - bg.lum));
                const text = rest[0] || { r: bg.lum > 128 ? 0 : 255, g: bg.lum > 128 ? 0 : 255, b: bg.lum > 128 ? 0 : 255 };

                // btn and accent from remaining
                const others = rest.slice(1);
                const btn = others[0] || text;
                const accent = others[1] || others[0] || text;

                resolve({
                    bgColor: toHex(bg),
                    textColor: toHex(text),
                    btnColor: toHex(btn),
                    accentColor: toHex(accent)
                });
            };
            img.src = URL.createObjectURL(blob);
        });

        // Apply to color pickers
        document.getElementById('cfg-bg-color').value = colors.bgColor;
        document.getElementById('cfg-text-color').value = colors.textColor;
        document.getElementById('cfg-btn-color').value = colors.btnColor;
        document.getElementById('cfg-accent-color').value = colors.accentColor;

        feedback.textContent = 'Couleurs extraites !';
        setTimeout(() => { feedback.textContent = ''; }, 2000);
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
        const MAX_ZIP_BYTES = 300 * 1024 * 1024; // 300 MB per zip

        try {
            let parts = [];
            let currentPart = [];
            let currentSize = 0;

            const totalBytes = videos.reduce((sum, v) => sum + (v.blob.size || 0), 0);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            progress.textContent = `${videos.length} vidéos, ${totalMB} Mo au total`;
            console.log('[ZIP] Videos:', videos.map(v => `${v.filename}: ${(v.blob.size / (1024 * 1024)).toFixed(1)} Mo`));

            videos.forEach(v => {
                const size = v.blob.size || 0;
                if (currentPart.length > 0 && currentSize + size > MAX_ZIP_BYTES) {
                    parts.push(currentPart);
                    currentPart = [];
                    currentSize = 0;
                }
                currentPart.push(v);
                currentSize += size;
            });
            if (currentPart.length > 0) parts.push(currentPart);

            for (let i = 0; i < parts.length; i++) {
                const label = parts.length > 1 ? ` (${i + 1}/${parts.length})` : '';
                progress.textContent = `Préparation du ZIP${label}...`;

                const zip = new JSZip();
                parts[i].forEach(v => zip.file(v.filename, v.blob));
                const content = await zip.generateAsync({ type: 'blob' });

                const suffix = parts.length > 1 ? `-part${i + 1}` : '';
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `allo-souvenirs-videos${suffix}.zip`;
                a.click();
                URL.revokeObjectURL(url);

                // pause between downloads so iOS doesn't block them
                if (i < parts.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            progress.textContent = parts.length > 1
                ? `${parts.length} ZIPs téléchargés !`
                : 'ZIP téléchargé !';
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
