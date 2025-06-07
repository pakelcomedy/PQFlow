// scripts/tv.js

// Update clock every second
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

// Firestore real-time listener for current number, branch & service
async function initTVMode() {
  startClock();

  // Assume current branch/service IDs are stored in query params
  const params = new URLSearchParams(window.location.search);
  const branchId = params.get('branch') || 'default-branch';
  const serviceId = params.get('service') || 'default-service';

  // Display branch/service labels
  document.getElementById('tv-branch').textContent = `Branch: ${branchId}`;
  document.getElementById('tv-service').textContent = `Service: ${serviceId}`;

  // Reference Firestore collection: queues/{branch}/{service}/current
  const docRef = firestore
    .collection('branches').doc(branchId)
    .collection('services').doc(serviceId);

  // Listen for changes
  docRef.onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    if (data.currentNumber !== undefined) {
      document.getElementById('number-display').textContent = data.currentNumber;
    }
  }, err => {
    console.error('TV mode listener error:', err);
  });
}

// Initialize after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  initFirestore();    // from firestore.js
  initTVMode();       // this file
});
