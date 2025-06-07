// scripts/admin/admin.js
(function() {
  // ————————————————————————————————
  // INIT FIRESTORE & AUTH
  // ————————————————————————————————
  if (typeof initFirestore === 'function') initFirestore();
  const auth = firebase.auth();
  const db   = firebase.firestore();

  // ————————————————————————————————
  // APP STATE & UI REFS
  // ————————————————————————————————
  let orgId = null;
  let ticketsCol = null;
  let unsubscribeWaiting = null;
  let lastCalledTicket = null;

  const counterSelect   = document.getElementById('counter-select');
  const btnCall         = document.getElementById('btn-call');
  const btnSkip         = document.getElementById('btn-skip');
  const btnReset        = document.getElementById('btn-reset');
  const btnBack         = document.getElementById('btn-back');
  const currentNumberEl = document.getElementById('current-number');
  const waitingBody     = document.getElementById('waiting-body');

  // ————————————————————————————————
  // HELPERS
  // ————————————————————————————————
  function clearWaiting() {
    if (waitingBody) waitingBody.innerHTML = '';
  }

  function renderWaitingRow(doc) {
    if (!waitingBody) return;
    const d = doc.data();
    const tr = document.createElement('tr');
    tr.dataset.id = doc.id;
    tr.innerHTML = `
      <td>${d.number}</td>
      <td>${d.createdAt?.toDate().toLocaleTimeString() || '-'}</td>
      <td>${d.priority || 'Normal'}</td>
      <td>${d.source || 'Link'}</td>
    `;
    waitingBody.appendChild(tr);
  }

  function subscribeWaiting(counterId) {
    if (unsubscribeWaiting) unsubscribeWaiting();
    if (!orgId) return;

    ticketsCol = db
      .collection('organizations').doc(orgId)
      .collection('tickets');

    unsubscribeWaiting = ticketsCol
      .where('servedAt', '==', null)
      .where('counter', '==', counterId)
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        clearWaiting();
        if (snap.empty) {
          waitingBody.innerHTML = `<tr><td colspan="4" class="empty">No active tickets</td></tr>`;
        } else {
          snap.docs.forEach(renderWaitingRow);
        }
      }, err => {
        console.error('Waiting listener error:', err);
      });
  }

  // ————————————————————————————————
  // CONTROL BINDING
  // ————————————————————————————————
  function initControls() {
    // Disable semua tombol dulu
    [btnCall, btnSkip, btnReset, btnBack].forEach(b => { if (b) b.disabled = true; });

    // Dropdown counter
    counterSelect.addEventListener('change', () => {
      const cnt = counterSelect.value;
      const ready = !!cnt;
      [btnCall, btnSkip, btnReset, btnBack].forEach(b => { if (b) b.disabled = !ready; });
      if (ready) subscribeWaiting(cnt);
      else clearWaiting();
    });

    // Call Next
    btnCall.addEventListener('click', async () => {
      const cnt = counterSelect.value;
      if (!cnt) return alert('Please select a counter first.');
      const snap = await ticketsCol
        .where('servedAt','==',null)
        .where('counter','==',cnt)
        .orderBy('createdAt','asc')
        .limit(1)
        .get();
      if (snap.empty) return alert('No tickets to call.');
      lastCalledTicket = snap.docs[0];
      currentNumberEl.textContent = lastCalledTicket.data().number;
    });

    // Skip
    btnSkip.addEventListener('click', async () => {
      if (!lastCalledTicket) return;
      await lastCalledTicket.ref.update({ skippedAt: firebase.firestore.FieldValue.serverTimestamp() });
      currentNumberEl.textContent = '—';
    });

    // Back
    btnBack.addEventListener('click', async () => {
      if (!lastCalledTicket) return;
      await lastCalledTicket.ref.update({ skippedAt: firebase.firestore.FieldValue.delete() });
      currentNumberEl.textContent = lastCalledTicket.data().number;
    });

    // Reset
    btnReset.addEventListener('click', async () => {
      if (!confirm('Reset queue?')) return;
      const cnt = counterSelect.value;
      const snap = await ticketsCol
        .where('servedAt','==',null)
        .where('counter','==',cnt).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.update(d.ref, {
        resetAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
      await batch.commit();
      currentNumberEl.textContent = '—';
      lastCalledTicket = null;
      clearWaiting();
    });
  }

  // ————————————————————————————————
  // AUTH STATE → INIT DATA & CONTROLS
  // ————————————————————————————————
  auth.onAuthStateChanged(async user => {
    if (!user) {
      return location.replace('../auth/login.html');
    }
    orgId = user.uid;

    // Ambil daftar counter dari per‐user settings
    const countersSnap = await db
      .collection('users').doc(orgId)
      .collection('settings').doc('config')
      .collection('counters')
      .get();

    // Populate dropdown
    if (counterSelect) {
      counterSelect.innerHTML = '<option value="">-- Select Counter --</option>';
      countersSnap.forEach(doc => {
        const { label } = doc.data();
        counterSelect.insertAdjacentHTML(
          'beforeend',
          `<option value="${doc.id}">${label}</option>`
        );
      });
    }

    // Pasang controls & listener
    initControls();
  });

  // ————————————————————————————————
  // MOBILE NAV TOGGLE (opsional)
  // ————————————————————————————————
  const navToggle = document.querySelector('.mobile-nav-toggle');
  navToggle?.addEventListener('click', () => {
    const nav = document.getElementById('main-nav');
    const exp = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!exp));
    nav.classList.toggle('open');
  });

})();
