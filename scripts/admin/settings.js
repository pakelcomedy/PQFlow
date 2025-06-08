// File: scripts/admin/settings.js
;(async function() {
  // ————————————— Init Firestore/Auth —————————————
  if (typeof initFirestore === 'function') initFirestore();
  const auth = firebase.auth();
  const db   = firebase.firestore();

  // ————————————— UI References —————————————
  const systemNameEl  = document.getElementById('system-name');
  const hoursRadios   = Array.from(document.getElementsByName('hours-mode'));
  const customHoursEl = document.getElementById('custom-hours');
  const openTimeEl    = document.getElementById('open-time');
  const closeTimeEl   = document.getElementById('close-time');
  const countersBody  = document.getElementById('counters-body');
  const addCounterBtn = document.getElementById('add-counter-btn');
  const saveBtn       = document.getElementById('save-settings-btn');
  const resetBtn      = document.getElementById('reset-settings-btn');
  const logoutBtn     = document.getElementById('logout-btn');
  const genLinkBtn    = document.getElementById('gen-link-btn');
  const linkGroup     = document.getElementById('link-group');
  const qrGroup       = document.getElementById('qr-group');
  const orgLinkEl     = document.getElementById('org-link');
  const qrCanvas      = document.getElementById('qr-canvas');

  // ————————————— Defaults & Helpers —————————————
  if (openTimeEl)  openTimeEl.step  = 60;
  if (closeTimeEl) closeTimeEl.step = 60;

  const defaults = {
    systemName: '',
    hoursMode:  'custom',
    openTime:   '08:00',
    closeTime:  '17:00'
  };

  function showCustom(yes) {
    if (customHoursEl) customHoursEl.style.display = yes ? 'grid' : 'none';
  }
  function getMode() {
    const sel = hoursRadios.find(r => r.checked);
    return sel ? sel.value : defaults.hoursMode;
  }
  function setMode(v) {
    hoursRadios.forEach(r => r.checked = (r.value === v));
    showCustom(v === 'custom');
  }

  function sanitizeTime(raw) {
    if (!raw) return '';
    const [hRaw, mRaw] = raw.replace('.', ':').split(':');
    const h = parseInt(hRaw,10), m = parseInt(mRaw,10);
    if ([h,m].some(x=>isNaN(x)) || h<0||h>23||m<0||m>59) {
      throw new Error('Waktu tidak valid (HH:MM)');
    }
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  }

  // Render one counter row
  function renderCounter(id, label, colRef) {
    const tr = document.createElement('tr');
    tr.dataset.id = id;
    tr.innerHTML = `
      <td>${id}</td>
      <td><input type="text" class="counter-label" value="${label}" /></td>
      <td>
        <button class="btn btn-outline btn-save">💾</button>
        <button class="btn btn-outline btn-delete">🗑️</button>
      </td>
    `;
    // ————— Save uses the **new** input value —————
    tr.querySelector('.btn-save').onclick = async () => {
      const newLabel = tr.querySelector('.counter-label').value.trim();
      if (!newLabel) return alert('Label tidak boleh kosong.');
      await colRef.doc(id).set({
        label:     newLabel,                                  // ← here
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      alert('Counter disimpan.');
    };
    tr.querySelector('.btn-delete').onclick = async () => {
      if (!confirm(`Hapus counter "${id}"?`)) return;
      await colRef.doc(id).delete();
      tr.remove();
    };
    countersBody.appendChild(tr);
  }

  // ————————————— On Auth State —————————————
  auth.onAuthStateChanged(async user => {
    if (!user) {
      location.replace('../auth/login.html');
      return;
    }
    const uid = user.uid;

    // Firestore refs
    const configDoc   = db.collection('users')
                          .doc(uid)
                          .collection('settings')
                          .doc('config');
    const countersCol = configDoc.collection('counters');

    // Load UI
    async function loadAll() {
      const snap = await configDoc.get();
      const cfg  = snap.exists ? snap.data() : defaults;

      systemNameEl.value = cfg.systemName || defaults.systemName;
      setMode(cfg.hoursMode || defaults.hoursMode);
      openTimeEl.value  = cfg.openTime  || defaults.openTime;
      closeTimeEl.value = cfg.closeTime || defaults.closeTime;

      countersBody.innerHTML = '';
      const cSnap = await countersCol.get();
      cSnap.forEach(d => renderCounter(d.id, d.data().label, countersCol));
    }

    // +Add Counter
    addCounterBtn.onclick = () => {
      const newId = countersCol.doc().id;
      renderCounter(newId, '', countersCol);
    };

    // Save All Settings
    saveBtn.onclick = async () => {
      let ot, ct;
      try {
        ot = sanitizeTime(openTimeEl.value);
        ct = sanitizeTime(closeTimeEl.value);
      } catch (e) {
        return alert(e.message);
      }
      await configDoc.set({
        systemName: systemNameEl.value.trim(),
        hoursMode:  getMode(),
        openTime:   ot,
        closeTime:  ct,
        updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      alert('Pengaturan tersimpan.');
    };

    // Reset to defaults
    resetBtn.onclick = () => {
      if (!confirm('Reset ke nilai default?')) return;
      systemNameEl.value = defaults.systemName;
      setMode(defaults.hoursMode);
      openTimeEl.value  = defaults.openTime;
      closeTimeEl.value = defaults.closeTime;
    };

    // Generate Link & QR
    genLinkBtn.onclick = () => {
      const base    = 'https://pakelcomedy.github.io/PQFlow/pages/tv.html';
      const joinUrl = `${base}?org=${uid}`;

      linkGroup.style.display = 'block';
      orgLinkEl.textContent   = joinUrl;
      orgLinkEl.href          = joinUrl;

      qrGroup.style.display   = 'block';
      qrCanvas.innerHTML      = '';
      new QRCode(qrCanvas, {
        text:   joinUrl,
        width:  180,
        height: 180
      });
    };

    // Logout
    logoutBtn.onclick = async () => {
      logoutBtn.disabled = true;
      try { await auth.signOut(); }
      catch (err) { console.error(err); alert('Logout gagal.'); }
    };

    // Toggle custom‐hours
    hoursRadios.forEach(r => r.onchange = () => showCustom(getMode() === 'custom'));

    // Initial load
    await loadAll();
  });

})();
