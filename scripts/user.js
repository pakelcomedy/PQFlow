// scripts/user.js
;(async function() {
  // 1) Init Firestore
  if (typeof initFirestore === 'function') initFirestore();
  const db = firebase.firestore();

  // 2) Grab elements & URL param
  const params    = new URLSearchParams(location.search);
  const orgId     = params.get('org');
  const joinBtn   = document.getElementById('join-link-btn'); // matches your index.html
  const statusEl  = document.getElementById('status-message'); // matches your index.html
  const ticketSec = document.getElementById('ticket-section');
  const ticketDisp= document.getElementById('ticket-display');

  if (!orgId) {
    statusEl.textContent = 'Invalid link.';
    return;
  }

  // 3) Verify org exists by checking your per‑user settings path
  const cfgSnap = await db
    .collection('users').doc(orgId)
    .collection('settings').doc('config')
    .get();
  if (!cfgSnap.exists) {
    statusEl.textContent = 'Organization not found.';
    return;
  }

  const orgName = cfgSnap.data().systemName || 'our queue';
  statusEl.textContent = `Welcome to ${orgName}!`;
  joinBtn.style.display = 'inline-block';

  // 4) Click handler: bump counter + create ticket + redirect
  joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    statusEl.textContent = 'Generating your ticket…';

    try {
      // Reference your org’s “counter” doc and “tickets” collection
      const orgRef     = db.collection('organizations').doc(orgId);
      const counterRef= orgRef.collection('meta').doc('counter');
      const ticketsCol= orgRef.collection('tickets');

      const { newTicketId, number } = await db.runTransaction(async tx => {
        // a) read & bump the counter
        const ctrSnap = await tx.get(counterRef);
        let nextNum = 1;
        if (ctrSnap.exists) {
          nextNum = (ctrSnap.data().current || 0) + 1;
          tx.update(counterRef, { current: nextNum });
        } else {
          tx.set(counterRef, { current: 1 });
        }

        // b) create ticket doc
        const ticketRef = ticketsCol.doc();
        tx.set(ticketRef, {
          orgId,
          number,
          createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
          servedAt:   null,
          skippedAt:  null
        });

        return { newTicketId: ticketRef.id, number: nextNum };
      });

      // c) show the number briefly (optional)
      if (ticketSec && ticketDisp) {
        ticketDisp.textContent = number;
        ticketSec.style.display = 'block';
      }

      // d) redirect into TV mode (with both org & ticket)
      setTimeout(() => {
        window.location.href = `/pages/tv.html?org=${orgId}&ticket=${newTicketId}`;
      }, 1500);

    } catch (err) {
      console.error('Join error:', err);
      statusEl.textContent = 'Failed to join. Try again.';
      joinBtn.disabled = false;
    }
  });
})();
