;(function() {
  // ————— Init Firestore —————
  if (typeof initFirestore === 'function') initFirestore();
  const db = firebase.firestore();

  // ————— Clock Display —————
  function startClock() {
    const clk = document.getElementById('tv-clock');
    setInterval(() => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2,'0');
      const mm = now.getMinutes().toString().padStart(2,'0');
      const ss = now.getSeconds().toString().padStart(2,'0');
      clk.textContent = `${hh}:${mm}:${ss}`;
    }, 1000);
  }

  // ————— Progress Logic —————
  const PROG_R    = 45;                            // radius from SVG
  const CIRCUM    = 2 * Math.PI * PROG_R;          // full circle
  let currentServed = 0, currentMine = 0;

  function updateProgress() {
    const circle = document.querySelector('.circle-fill');
    const txt    = document.getElementById('progress-percent');
    if (!circle || currentMine <= 0) return;

    // hitung persen: served / mine * 100, clamp 0..100
    const pct = Math.min(100, Math.max(0, (currentServed / currentMine) * 100));
    // stroke-dasharray & offset
    circle.setAttribute('stroke-dasharray', `${CIRCUM}`);
    const offset = CIRCUM * (1 - pct / 100);
    circle.setAttribute('stroke-dashoffset', offset);

    txt.textContent = `${Math.floor(pct)}%`;
  }

  // ————— Main Init —————
  async function initTV() {
    startClock();

    // Parse URL params
    const p        = new URLSearchParams(window.location.search);
    const orgId    = p.get('org');
    let   ticketId = p.get('ticket');

    const yourEl    = document.getElementById('ticket-display');
    const servingEl = document.getElementById('served-number');
    const orgEl     = document.getElementById('tv-org-name');

    if (!orgId) {
      yourEl.textContent    = 'Invalid link';
      servingEl.textContent = '—';
      return;
    }

    // Fetch Organization Name
    const cfgSnap = await db
      .collection('users').doc(orgId)
      .collection('settings').doc('config')
      .get();
    const orgName = cfgSnap.exists && cfgSnap.data().systemName
      ? cfgSnap.data().systemName
      : orgId;
    orgEl.textContent = orgName;

    // Create ticket once (jika belum ada ticketId)
    if (!ticketId) {
      try {
        const baseRef    = db.collection('organizations').doc(orgId);
        const counterRef = baseRef.collection('counters').doc('current');
        const ticketsCol = baseRef.collection('tickets');

        const { id } = await db.runTransaction(async tx => {
          const ctr = await tx.get(counterRef);
          let next = 1;
          if (ctr.exists && ctr.data().current) {
            next = ctr.data().current + 1;
            tx.update(counterRef, { current: next });
          } else {
            tx.set(counterRef, { current: 1 });
          }
          const newDoc = ticketsCol.doc();
          tx.set(newDoc, {
            number:    next,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            servedAt:  null,
            skippedAt: null,
            counter:   null
          });
          return { id: newDoc.id };
        });

        ticketId = id;
        // push ke URL agar tidak regenerasi setelah reload
        p.set('ticket', ticketId);
        history.replaceState(null, '', `${location.pathname}?${p}`);
      } catch (e) {
        console.error('Error creating ticket:', e);
        yourEl.textContent = 'Failed to join queue';
        return;
      }
    }

    // Listen ke dokumen tiket (Your Ticket)
    const yourRef = db
      .collection('organizations').doc(orgId)
      .collection('tickets').doc(ticketId);
    yourRef.onSnapshot(doc => {
      if (!doc.exists) {
        yourEl.textContent = 'Ticket not found';
        return;
      }
      const num = doc.data().number ?? 0;
      yourEl.textContent = num;
      currentMine = num;
      updateProgress();
    }, err => {
      console.error('Your ticket listener:', err);
      yourEl.textContent = 'Error';
    });

    // Listen ke tiket terakhir yang served (Now Serving)
    const servedQuery = db
      .collection('organizations').doc(orgId)
      .collection('tickets')
      .where('servedAt', '!=', null)
      .orderBy('servedAt', 'desc')
      .limit(1);

    servedQuery.onSnapshot(snap => {
      if (snap.empty) {
        servingEl.textContent = '—';
        currentServed = 0;
      } else {
        const num = snap.docs[0].data().number;
        servingEl.textContent = num;
        currentServed = num;
      }
      updateProgress();
    }, err => {
      console.error('Now serving listener:', err);
      servingEl.textContent = '—';
      currentServed = 0;
      updateProgress();
    });
  }

  // DOM Ready
  document.addEventListener('DOMContentLoaded', initTV);
})();
