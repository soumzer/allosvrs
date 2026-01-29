// Storage module - Config (localStorage) and VideoStorage (IndexedDB)

const Config = {
    defaults: {
        buttonPosition: 'bottom-center',
        countdownDuration: 5,
        maxRecording: 600,
        beep: 'on',
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
        const filename = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}.mp4`;
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
