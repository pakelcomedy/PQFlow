(() => {
  const DEFAULT_LANG = 'en';
  const STORAGE_KEY  = 'lang';
  const DICT_FOLDER  = 'lang/';       // <<-- diubah
  const TEXT_ATTR    = 'data-i18n';
  const PH_ATTR      = 'data-i18n-placeholder';

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
      return dict;
    } catch (err) {
      console.warn(`i18n: gagal load "${lang}", fallback ke "${DEFAULT_LANG}"`);
      if (lang !== DEFAULT_LANG) {
        return fetchDict(DEFAULT_LANG);
      }
      return {};
    }
  }

  function applyText(dict) {
    document.querySelectorAll(`[${TEXT_ATTR}]`).forEach(el => {
      const key = el.getAttribute(TEXT_ATTR);
      if (dict[key] != null) el.textContent = dict[key];
    });
  }

  function applyPlaceholder(dict) {
    document.querySelectorAll(`[${PH_ATTR}]`).forEach(el => {
      const key = el.getAttribute(PH_ATTR);
      if (dict[key] != null) el.setAttribute('placeholder', dict[key]);
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

    if (selector) {
      selector.value = saved;
      selector.addEventListener('change', () => {
        setLanguage(selector.value);
      });
    }

    setLanguage(saved);
  });
})();
