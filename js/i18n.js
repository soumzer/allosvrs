const I18n = {
    translations: {},
    currentLang: 'fr',

    async load(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            this.translations = await response.json();
            this.currentLang = lang;
            document.documentElement.dir = (lang === 'ar' || lang === 'ur') ? 'rtl' : 'ltr';
            document.documentElement.lang = lang;
            this.apply();
        } catch (e) {
            console.error('Failed to load language:', lang, e);
        }
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
