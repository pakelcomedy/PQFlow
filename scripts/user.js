// scripts/user.js
;(async () => {
  // 1) Init Firestore/Auth
  if (typeof initFirestore === 'function') initFirestore();

  // 2) Grab query param + DOM nodes
  const params   = new URLSearchParams(location.search);
  const orgId    = params.get('org');
  const statusEl = document.getElementById('status-message');
  const joinBtn  = document.getElementById('join-link-btn');

  // 3) Validate orgId
  if (!orgId) {
    statusEl.textContent = 'Invalid link.';
    return;
  }

  // 4) Fetch org’s settings to get a friendly name
  try {
    const cfgRef = db
      .collection('users').doc(orgId)
      .collection('settings').doc('config');
    const cfgSnap = await cfgRef.get();
    if (!cfgSnap.exists) {
      statusEl.textContent = 'Organization not found.';
      return;
    }
    const { systemName = 'this organization' } = cfgSnap.data();
    statusEl.textContent    = `Welcome to ${systemName}!`;
    joinBtn.style.display   = 'inline-block';
  } catch (err) {
    console.error('Failed to load organization info:', err);
    statusEl.textContent = 'Could not load organization.';
    return;
  }

  // 5) Handle “Join Queue” click
  joinBtn.addEventListener('click', async () => {
    joinBtn.disabled     = true;
    statusEl.textContent = 'Getting your number…';

    const counterRef  = db
      .collection('organizations').doc(orgId)
      .collection('counters').doc('current');
    const ticketsCol  = db
      .collection('organizations').doc(orgId)
      .collection('tickets');

    try {
      // 6) Atomically bump counter + write ticket
      const yourNumber = await db.runTransaction(async tx => {
        const snap = await tx.get(counterRef);
        let next = 1;
        if (snap.exists) {
          next = (snap.data().current || 0) + 1;
        }
        tx.set(counterRef, { current: next }, { merge: true });

        const reqRef = ticketsCol.doc();
        tx.set(reqRef, {
          number:    next,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status:    'waiting'
        });

        return next;
      });

      // 7) Success
      statusEl.innerHTML = `Your queue number is <strong>${yourNumber}</strong>.`;
    } catch (err) {
      console.error('Join queue failed:', err);
      statusEl.textContent = 'Failed to join queue. Please try again.';
      joinBtn.disabled     = false;
    }
  });
})();
