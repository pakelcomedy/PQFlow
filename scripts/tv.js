// scripts/tv.js

// —————— Firestore init ——————
if (typeof initFirestore === 'function') initFirestore();
const db = firebase.firestore();

// —————— Clock ——————
function startClock(){
  const el = document.getElementById('tv-clock');
  setInterval(()=>{
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-GB');
  }, 1000);
}

// —————— On load ——————
window.addEventListener('DOMContentLoaded', async () => {
  startClock();

  // parse org ID from URL
  const params   = new URLSearchParams(location.search);
  const orgId    = params.get('org');
  if (!orgId) {
    document.getElementById('number-display').textContent = 'Invalid link';
    return;
  }

  // DOM refs
  const disp   = document.getElementById('number-display');
  const hdr    = document.getElementById('tv-branch');
  hdr.textContent = `Organization: ${orgId}`;

  // ONE‑TIME transaction: atomically increment counter & create ticket,
  // then display that number and NEVER increment again on reload.
  // We store the assigned ticket ID in sessionStorage so refresh won't re-run.
  let ticketNum = sessionStorage.getItem(`pq-${orgId}-ticket`);
  if (!ticketNum) {
    ticketNum = await db.runTransaction(async tx => {
      const counterRef = db.collection('queues').doc(orgId);
      const snap       = await tx.get(counterRef);
      let nextNum = 1;
      if (snap.exists && snap.data().current) {
        nextNum = snap.data().current + 1;
        tx.update(counterRef, { current: nextNum });
      } else {
        tx.set(counterRef, { current: 1 });
      }
      // persist ticket record
      const tRef = db.collection('queues').doc(orgId)
                     .collection('tickets').doc();
      tx.set(tRef, {
        number:    nextNum,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status:    'waiting'
      });
      return nextNum;
    });
    sessionStorage.setItem(`pq-${orgId}-ticket`, ticketNum);
  }

  // display
  disp.textContent = ticketNum;
});
