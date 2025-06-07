// scripts/admin/settings.js
(async function() {
  // ————————————— Init Firestore/Auth —————————————
  if (typeof initFirestore === 'function') initFirestore();
  const auth = firebase.auth();
  const db   = firebase.firestore();

  // ————————————— UI References —————————————
  const systemNameEl  = document.getElementById('system-name');
  const hoursRadios   = [...document.getElementsByName('hours-mode')];
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
  openTimeEl.step  = closeTimeEl.step = 60;  // minute precision

  const defaults = {
    systemName: '',
    hoursMode:  'custom',
    openTime:   '08:00',
    closeTime:  '17:00'
  };

  const showCustom = show => customHoursEl.style.display = show ? 'grid' : 'none';
  const getMode    = () => hoursRadios.find(r => r.checked).value;
  const setMode    = v => {
    hoursRadios.forEach(r => r.checked = (r.value === v));
    showCustom(v === 'custom');
  };

  function sanitizeTime(raw) {
    if (!raw) return '';
    const [hRaw, mRaw] = raw.replace('.', ':').split(':');
    const h = parseInt(hRaw, 10), m = parseInt(mRaw, 10);
    if ([h,m].some(x=>isNaN(x)) || h<0||h>23||m<0||m>59) {
      throw new Error('Waktu tidak valid (HH:MM)');
    }
    return `${h}`.padStart(2,'0') + ':' + `${m}`.padStart(2,'0');
  }

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
    tr.querySelector('.btn-save').onclick = async () => {
      const newLabel = tr.querySelector('.counter-label').value.trim();
      if (!newLabel) return alert('Label tidak boleh kosong.');
      await colRef.doc(id).set({
        label:     newLabel,
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
    if (!user) return location.replace('../auth/login.html');

    const uid       = user.uid;
    const configDoc = db.collection('users').doc(uid)
                        .collection('settings').doc('config');
    const countersCol = configDoc.collection('counters');

    // Load
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

    // Add Counter
    addCounterBtn.onclick = () => {
      const newId = countersCol.doc().id;
      renderCounter(newId, '', countersCol);
    };

    // Save Config
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

    // Reset to Defaults
    resetBtn.onclick = () => {
      if (!confirm('Reset ke nilai default?')) return;
      systemNameEl.value = defaults.systemName;
      setMode(defaults.hoursMode);
      openTimeEl.value  = defaults.openTime;
      closeTimeEl.value = defaults.closeTime;
    };

    // Generate Link & QR
    genLinkBtn.onclick = () => {
      // build the join URL (pointing to your local dev server)
      const base = 'http://127.0.0.1:3000/pages/tv.html';
      const joinUrl = `${base}?org=${uid}`;
      // display
      orgLinkEl.textContent = joinUrl;
      orgLinkEl.href        = joinUrl;
      linkGroup.style.display = 'block';
      // render QR
      qrCanvas.innerHTML = '';
      new QRCode(qrCanvas, {
        text: joinUrl,
        width: 180,
        height: 180
      });
      qrCanvas.style.display = 'block';
    };

    // Logout
    logoutBtn.onclick = async () => {
      logoutBtn.disabled = true;
      try { await auth.signOut(); }
      catch(err){ console.error(err); alert('Logout gagal.'); }
    };

    // Toggle custom hours
    hoursRadios.forEach(r => r.onchange = () => showCustom(getMode()==='custom'));

    // Initial load
    await loadAll();
  });
})();
