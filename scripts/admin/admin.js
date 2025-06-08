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
    waitingBody && (waitingBody.innerHTML = '');
  }

  function renderWaitingRow(doc) {
    const d = doc.data();
    const tr = document.createElement('tr');
    tr.dataset.id = doc.id;
    tr.innerHTML = `
      <td>${d.number}</td>
      <td>${d.createdAt?.toDate().toLocaleTimeString() || '-'}</td>
      <td>${d.counter || '—'}</td>
      <td>${d.skippedAt ? '⏭️' : ''}</td>
    `;
    waitingBody.appendChild(tr);
  }

  // subscribe to ALL unserved tickets, sorted client‑side
  function subscribeWaiting() {
    unsubscribeWaiting && unsubscribeWaiting();
    ticketsCol = db
      .collection('organizations').doc(orgId)
      .collection('tickets');

    unsubscribeWaiting = ticketsCol
      .where('servedAt', '==', null)
      .onSnapshot(snapshot => {
        clearWaiting();
        const docs = snapshot.docs
          .map(d => ({ id: d.id, data: d.data() }))
          .sort((a, b) => {
            const ta = a.data.createdAt?.toMillis() || 0;
            const tb = b.data.createdAt?.toMillis() || 0;
            return ta - tb;
          });
        if (!docs.length) {
          waitingBody.innerHTML = `
            <tr><td colspan="4" class="empty">No active tickets</td></tr>
          `;
        } else {
          docs.forEach(item => {
            // create a fake doc-like object
            renderWaitingRow({ id: item.id, data: () => item.data });
          });
        }
      }, err => {
        console.error('Waiting listener error:', err);
      });
  }

  // ————————————————————————————————
  // CONTROLS
  // ————————————————————————————————
  function initControls() {
    [btnCall, btnSkip, btnReset, btnBack].forEach(b => b.disabled = false);

    // CALL NEXT: pick earliest, mark servedAt + counter
    btnCall.addEventListener('click', async () => {
      const selectedCounter = counterSelect.value;
      if (!selectedCounter) {
        return alert('Please select a counter first.');
      }

      // fetch all unserved
      const snap = await ticketsCol.get();
      const nextDoc = snap.docs
        .map(d => ({ ref:d.ref, data:d.data() }))
        .filter(x => x.data.servedAt == null)
        .sort((a, b) => {
          const ta = a.data.createdAt?.toMillis() || 0;
          const tb = b.data.createdAt?.toMillis() || 0;
          return ta - tb;
        })[0];

      if (!nextDoc) {
        return alert('No tickets to call.');
      }

      // mark it served + assign counter
      await nextDoc.ref.update({
        servedAt: firebase.firestore.FieldValue.serverTimestamp(),
        counter:  selectedCounter
      });

      lastCalledTicket = nextDoc;
      currentNumberEl.textContent = nextDoc.data.number;
    });

    // SKIP: timestamp skippedAt
    btnSkip.addEventListener('click', async () => {
      if (!lastCalledTicket) return;
      await lastCalledTicket.ref.update({
        skippedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      currentNumberEl.textContent = '—';
    });

    // BACK: remove skippedAt
    btnBack.addEventListener('click', async () => {
      if (!lastCalledTicket) return;
      await lastCalledTicket.ref.update({
        skippedAt: firebase.firestore.FieldValue.delete()
      });
      currentNumberEl.textContent = lastCalledTicket.data.number;
    });

    // RESET: mark all unserved as resetAt
    btnReset.addEventListener('click', async () => {
      if (!confirm('Reset queue?')) return;
      const snapAll = await ticketsCol.get();
      const batch = db.batch();
      snapAll.docs.forEach(d => {
        const data = d.data();
        if (data.servedAt == null) {
          batch.update(d.ref, {
            resetAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      await batch.commit();
      currentNumberEl.textContent = '—';
      lastCalledTicket = null;
      clearWaiting();
    });
  }

  // ————————————————————————————————
  // AUTH STATE → LOAD DROPDOWN, LISTEN & BIND
  // ————————————————————————————————
  auth.onAuthStateChanged(async user => {
    if (!user) {
      return location.replace('../auth/login.html');
    }
    orgId = user.uid;

    // load all counters from settings
    const countersSnap = await db
      .collection('users').doc(orgId)
      .collection('settings').doc('config')
      .collection('counters')
      .get();

    // fill dropdown
    counterSelect.innerHTML = `<option value="">-- Select Counter --</option>`;
    countersSnap.forEach(doc => {
      const { label } = doc.data();
      counterSelect.insertAdjacentHTML('beforeend',
        `<option value="${doc.id}">${label}</option>`
      );
    });

    // start listening & wire controls
    subscribeWaiting();
    initControls();
  });

  // ————————————————————————————————
  // MOBILE NAV TOGGLE (optional)
  // ————————————————————————————————
  document.querySelector('.mobile-nav-toggle')
    ?.addEventListener('click', () => {
      const nav = document.getElementById('main-nav');
      const btn = document.querySelector('.mobile-nav-toggle');
      const exp = btn.getAttribute('aria-expanded')==='true';
      btn.setAttribute('aria-expanded', String(!exp));
      nav.classList.toggle('open');
    });
})();
