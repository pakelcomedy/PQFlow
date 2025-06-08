// js/i18n.js — Handles loading & applying translations
(() => {
  const DEFAULT_LANG   = 'en';
  const STORAGE_KEY    = 'lang';
  const DICT_FOLDER    = 'lang/';      // <-- relative, no leading slash, ensure trailing slash
  const DATA_ATTR      = 'data-i18n';
  const PLACEHOLDER_AT = 'data-i18n-placeholder';

  const cache = new Map();
  let currentLang = null;

  const dictUrl = lang => `${DICT_FOLDER}${lang}.json`;

  async function fetchDict(lang) {
    if (cache.has(lang)) return cache.get(lang);
    try {
      const res = await fetch(dictUrl(lang), { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const dict = await res.json();
      cache.set(lang, dict);
      console.info(`i18n: loaded "${lang}"`);
      return dict;
    } catch (err) {
      console.warn(`i18n: failed to load "${lang}" (${err.message})`);
      // fallback ke default sekali saja
      if (lang !== DEFAULT_LANG) {
        return fetchDict(DEFAULT_LANG);
      }
      return {};
    }
  }

  function applyText(dict) {
    document.querySelectorAll(`[${DATA_ATTR}]`).forEach(el => {
      const key = el.getAttribute(DATA_ATTR);
      // support nested keys via foo.bar.baz
      const text = key.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : null, dict);
      if (text != null) {
        el.textContent = text;
      }
    });
  }

  function applyPlaceholder(dict) {
    document.querySelectorAll(`[${PLACEHOLDER_AT}]`).forEach(el => {
      const key = el.getAttribute(PLACEHOLDER_AT);
      const text = key.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : null, dict);
      if (text != null) {
        el.setAttribute('placeholder', text);
      }
    });
  }

  async function setLanguage(lang) {
    const dict = await fetchDict(lang);
    applyText(dict);
    applyPlaceholder(dict);
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    currentLang = lang;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('langSelector');
    const saved    = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

    // jika kamu pakai <select id="langSelector"> untuk switch
    if (selector) {
      selector.value = saved;
      selector.addEventListener('change', () => {
        setLanguage(selector.value);
      });
    }

    // langsung apply yang tersimpan
    setLanguage(saved);
  });
})();
