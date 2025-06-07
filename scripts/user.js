// scripts/user.js
(async function() {
  // 1) Init Firestore
  if (typeof initFirestore === 'function') initFirestore();
  const db = firebase.firestore();

  // 2) Grab elements & URL param
  const params   = new URLSearchParams(location.search);
  const orgId    = params.get('org');
  const joinBtn  = document.getElementById('join-btn');
  const statusEl = document.getElementById('status');

  if (!orgId) {
    statusEl.textContent = 'Invalid link.';
    return;
  }

  // 3) Verify org exists (settings/config must exist)
  const cfg = await db
    .collection('users').doc(orgId)
    .collection('settings').doc('config')
    .get();
  if (!cfg.exists) {
    statusEl.textContent = 'Organization not found.';
    return;
  }

  statusEl.textContent = `Welcome to ${cfg.data().systemName || 'our queue service'}`;
  joinBtn.style.display = 'inline-block';

  // 4) Click handler: create ticket then redirect
  joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusEl.textContent = 'Generating your ticket…';

    try {
      const baseRef   = db.collection('organizations').doc(orgId);
      const counterRef = baseRef.collection('counters').doc('current');
      const ticketsCol = baseRef.collection('tickets');

      // runTransaction to atomically bump counter and create ticket
      const { ticketId, number } = await db.runTransaction(async tx => {
        // a) Read & bump "current" counter
        const ctrSnap = await tx.get(counterRef);
        let nextNum = 1;
        if (ctrSnap.exists) {
          nextNum = (ctrSnap.data().current || 0) + 1;
          tx.update(counterRef, { current: nextNum });
        } else {
          tx.set(counterRef, { current: 1 });
        }

        // b) Create the ticket doc
        const newDocRef = ticketsCol.doc();
        tx.set(newDocRef, {
          number:     nextNum,
          createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
          servedAt:   null,
          skippedAt:  null,
          counter:    null
        });

        return { ticketId: newDocRef.id, number: nextNum };
      });

      // c) Redirect to TV page with org & ticket params
      location.href = `pages/tv.html?org=${orgId}&ticket=${ticketId}`;

    } catch (err) {
      console.error('Join error:', err);
      statusEl.textContent = 'Failed to get ticket. Try again.';
      joinBtn.disabled = false;
    }
  });
})();
