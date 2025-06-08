const defaultLang = 'en';
const supportedLangs = ['en', 'id'];
const btnEn = document.getElementById('lang-en');
const btnId = document.getElementById('lang-id');

function getLang() {
  return localStorage.getItem('lang') || defaultLang;
}

function setLang(lang) {
  if (!supportedLangs.includes(lang)) return;
  localStorage.setItem('lang', lang);
  loadAndApply(lang);
  updateButtons(lang);
}

async function loadAndApply(lang) {
  try {
    // tanpa slash depan, jadi relative ke folder HTML (atau ke base href jika dipakai)
    const res = await fetch(`lang/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = key.split('.').reduce((o,i) => o?.[i], data);
      if (text) el.innerText = text;
    });
  } catch (e) {
    console.error('Error loading lang file:', e);
  }
}

function updateButtons(activeLang) {
  supportedLangs.forEach(lang => {
    const btn = document.getElementById(`lang-${lang}`);
    const isActive = (lang === activeLang);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const lang = getLang();
  loadAndApply(lang);
  updateButtons(lang);

  btnEn.addEventListener('click', () => setLang('en'));
  btnId.addEventListener('click', () => setLang('id'));
});
