// scripts/settings.js
// ————————————————————————————————
// SETTINGS PAGE LOGIC (Per‐User) with minute‐precision fix
// ————————————————————————————————
(async function() {
  // 1. Init Firestore/Auth
  if (typeof initFirestore === 'function') initFirestore();

  // UI Elements
  const systemNameEl  = document.getElementById('system-name');
  const hoursRadios   = document.getElementsByName('hours-mode');
  const customHoursEl = document.getElementById('custom-hours');
  const openTimeEl    = document.getElementById('open-time');
  const closeTimeEl   = document.getElementById('close-time');
  const countersBody  = document.getElementById('counters-body');
  const addCounterBtn = document.getElementById('add-counter-btn');
  const saveBtn       = document.getElementById('save-settings-btn');
  const resetBtn      = document.getElementById('reset-settings-btn');
  const logoutBtn     = document.getElementById('logout-btn');

  // Force minute‐precision on time inputs
  openTimeEl.step  = 60; 
  closeTimeEl.step = 60;

  // Default UI values
  const defaultConfig = {
    systemName: '',
    hoursMode: 'custom',
    openTime: '08:00',
    closeTime: '17:00'
  };

  // Helpers
  const showCustom = show => customHoursEl.style.display = show ? 'grid' : 'none';
  const getMode   = () => [...hoursRadios].find(r => r.checked).value;
  const setMode   = v => {
    hoursRadios.forEach(r => r.checked = (r.value === v));
    showCustom(v === 'custom');
  };

  // Sanitize a time string: dot→colon, ensure HH:MM valid
  function sanitizeTime(raw) {
    if (!raw) return '';
    let s = raw.replace('.', ':');
    const parts = s.split(':');
    if (parts.length !== 2) throw new Error('Format harus HH:MM');
    const [hStr, mStr] = parts;
    const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
    if (
      isNaN(h) || isNaN(m) ||
      h < 0 || h > 23 ||
      m < 0 || m > 59
    ) throw new Error('Waktu tidak valid (HH:MM)');
    // pad to two digits
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Render a counter row (unchanged)
  function renderCounter(id, label, countersCol) {
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
    tr.querySelector('.btn-save').addEventListener('click', async () => {
      const newLabel = tr.querySelector('.counter-label').value.trim();
      if (!newLabel) return alert('Label tidak boleh kosong.');
      await countersCol.doc(id).set({
        label: newLabel,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      alert('Counter disimpan.');
    });
    tr.querySelector('.btn-delete').addEventListener('click', async () => {
      if (!confirm(`Hapus counter "${id}"?`)) return;
      await countersCol.doc(id).delete();
      tr.remove();
    });
    countersBody.appendChild(tr);
  }

  // Main: wait for auth state
  firebase.auth().onAuthStateChanged(async user => {
    if (!user) {
      return location.href = '../auth/login.html';
    }
    const uid = user.uid;
    const configDoc   = db.collection('users').doc(uid).collection('settings').doc('config');
    const countersCol = configDoc.collection('counters');

    // Load existing config + counters
    async function loadAll() {
      const cfgSnap = await configDoc.get();
      if (cfgSnap.exists) {
        const cfg = cfgSnap.data();
        systemNameEl.value = cfg.systemName ?? defaultConfig.systemName;
        setMode(cfg.hoursMode ?? defaultConfig.hoursMode);
        openTimeEl.value  = cfg.openTime  ?? defaultConfig.openTime;
        closeTimeEl.value = cfg.closeTime ?? defaultConfig.closeTime;
      } else {
        systemNameEl.value = defaultConfig.systemName;
        setMode(defaultConfig.hoursMode);
        openTimeEl.value  = defaultConfig.openTime;
        closeTimeEl.value = defaultConfig.closeTime;
      }
      countersBody.innerHTML = '';
      const snap = await countersCol.get();
      snap.forEach(doc => renderCounter(doc.id, doc.data().label, countersCol));
    }

    // Add new counter
    addCounterBtn.addEventListener('click', () => {
      const newId = countersCol.doc().id;
      renderCounter(newId, '', countersCol);
    });

    // Save all config with sanitized times
    saveBtn.addEventListener('click', async () => {
      let ot, ct;
      try {
        ot = sanitizeTime(openTimeEl.value);
        ct = sanitizeTime(closeTimeEl.value);
      } catch (e) {
        return alert(e.message);
      }
      const cfg = {
        systemName: systemNameEl.value.trim(),
        hoursMode: getMode(),
        openTime: ot,
        closeTime: ct,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await configDoc.set(cfg, { merge: true });
      alert('Pengaturan tersimpan.');
    });

    // Reset UI only
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset ke nilai default?')) return;
      systemNameEl.value = defaultConfig.systemName;
      setMode(defaultConfig.hoursMode);
      openTimeEl.value  = defaultConfig.openTime;
      closeTimeEl.value = defaultConfig.closeTime;
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
      try {
        logoutBtn.disabled = true;
        await firebase.auth().signOut();
        location.href = '../auth/login.html';
      } catch (err) {
        console.error(err);
        alert('Logout gagal.');
        logoutBtn.disabled = false;
      }
    });

    // Toggle custom hours when mode changes
    hoursRadios.forEach(r => r.addEventListener('change', () => showCustom(getMode() === 'custom')));

    // Initial load
    loadAll();
  });
})();
