// File: scripts/tv.js
;(function() {
  // ————————— Init Firestore —————————
  if (typeof initFirestore === 'function') initFirestore();
  const db = firebase.firestore();

  // ————————— Clock Display —————————
  function startClock() {
    const clockEl = document.getElementById('tv-clock');
    setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}:${ss}`;
    }, 1000);
  }

  // ————————— Main Init —————————
  async function initTV() {
    startClock();

    // 1) Parse URL params
    const params   = new URLSearchParams(window.location.search);
    const orgId    = params.get('org');
    let ticketId   = params.get('ticket');

    const dispEl = document.getElementById('number-display');
    const hdrEl  = document.getElementById('tv-branch');

    // 2) Validate org
    if (!orgId) {
      dispEl.textContent = 'Invalid link';
      return;
    }
    hdrEl.textContent = `Organization: ${orgId}`;

    // 3) If no ticketId yet, create one via transaction
    if (!ticketId) {
      try {
        const baseRef    = db.collection('organizations').doc(orgId);
        const counterRef = baseRef.collection('counters').doc('current');
        const ticketsCol = baseRef.collection('tickets');

        // Atomically bump & create
        const result = await db.runTransaction(async tx => {
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

        ticketId = result.id;
        // push the ticketId into the URL (so refresh won’t re-create)
        params.set('ticket', ticketId);
        history.replaceState(null, '', `${location.pathname}?${params}`);

      } catch (err) {
        console.error('Error creating ticket:', err);
        dispEl.textContent = 'Failed to join queue';
        return;
      }
    }

    // 4) Listen to your ticket doc
    const ticketRef = db
      .collection('organizations').doc(orgId)
      .collection('tickets').doc(ticketId);

    ticketRef.onSnapshot(doc => {
      if (!doc.exists) {
        dispEl.textContent = 'Ticket not found';
        return;
      }
      const data = doc.data();
      dispEl.textContent = data.number != null
        ? String(data.number)
        : '—';
    }, err => {
      console.error('TV listener error:', err);
      dispEl.textContent = 'Error loading ticket';
    });
  }

  // ————————— DOM Ready —————————
  document.addEventListener('DOMContentLoaded', initTV);
})();
