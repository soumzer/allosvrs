// Storage module - Config (localStorage) and VideoStorage (IndexedDB)

const Config = {
    defaults: {
        buttonPosition: { x: 50, y: 85, width: 30, height: 10 },
        countdownDuration: 5,
        maxRecording: 600,
        beep: 'on',
        language: 'fr',
        theme: 'mariage-classique',
        customColors: null,
        hostNames: '',
        pin: '2402'
    },

    get(key) {
        const stored = localStorage.getItem('allosvrs_config');
        let val;
        if (stored) {
            const parsed = JSON.parse(stored);
            if (key in parsed) val = parsed[key];
        }
        if (val === undefined) val = this.defaults[key];
        return this._migrate(key, val);
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
        const merged = { ...this.defaults, ...config };
        Object.keys(merged).forEach(k => {
            merged[k] = this._migrate(k, merged[k]);
        });
        return merged;
    },

    saveAll(obj) {
        localStorage.setItem('allosvrs_config', JSON.stringify(obj));
    },

    _migrate(key, val) {
        if (key === 'buttonPosition' && typeof val === 'string') {
            return this._legacyPositionToObject(val);
        }
        return val;
    },

    _legacyPositionToObject(str) {
        const map = {
            'top-left':      { x: 15, y: 8,  width: 30, height: 10 },
            'top-center':    { x: 50, y: 8,  width: 30, height: 10 },
            'top-right':     { x: 85, y: 8,  width: 30, height: 10 },
            'middle-left':   { x: 15, y: 50, width: 30, height: 10 },
            'middle-center': { x: 50, y: 50, width: 30, height: 10 },
            'middle-right':  { x: 85, y: 50, width: 30, height: 10 },
            'bottom-left':   { x: 15, y: 92, width: 30, height: 10 },
            'bottom-center': { x: 50, y: 85, width: 30, height: 10 },
            'bottom-right':  { x: 85, y: 92, width: 30, height: 10 }
        };
        return map[str] || { x: 50, y: 85, width: 30, height: 10 };
    }
};

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

    async saveVideo(blob, promoAuthorized) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const filename = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}m${pad(now.getSeconds())}.mp4`;
        const record = { blob, filename, timestamp: now.toISOString(), promoAuthorized: !!promoAuthorized };

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
