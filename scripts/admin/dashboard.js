// scripts/admin/dashboard.js
(async function() {
  // ———————————————— Init Firestore & Auth ————————————————
  if (typeof initFirestore === 'function') initFirestore();
  const auth = firebase.auth();
  const db   = firebase.firestore();

  // ———————————————— DOM References ————————————————
  const totalCountersEl    = document.getElementById('total-counters');
  const todaysTicketsEl    = document.getElementById('todays-tickets');
  const pendingQueuesEl    = document.getElementById('pending-queues');
  const recentBody         = document.getElementById('recent-activity-body');
  const dailyCtx           = document.getElementById('dailyQueueChart').getContext('2d');
  const counterCompCtx     = document.getElementById('counterComparisonChart').getContext('2d');

  // Helper to zero out table
  function clearRecent() {
    recentBody.innerHTML = '';
  }

  // Format a Firestore Timestamp to local date string
  function formatDate(ts) {
    return ts?.toDate().toLocaleString() || '-';
  }

  auth.onAuthStateChanged(async user => {
    if (!user) {
      return location.replace('../auth/login.html');
    }
    const orgId = user.uid;
    const baseRef = db.collection('organizations').doc(orgId);
    const countersRef = baseRef.collection('counters');
    const ticketsRef  = baseRef.collection('tickets');

    // —————— 1) Total Counters ——————
    try {
      const cntSnap = await countersRef.get();
      totalCountersEl.textContent = cntSnap.size;
    } catch (e) {
      console.error('Error loading counters:', e);
      totalCountersEl.textContent = '—';
    }

    // —————— 2) Today's Tickets & Pending ——————
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    try {
      const todaySnap = await ticketsRef
        .where('createdAt', '>=', todayStart)
        .where('createdAt', '<',  todayEnd)
        .get();
      todaysTicketsEl.textContent = todaySnap.size;
    } catch (e) {
      console.error('Error loading today’s tickets:', e);
      todaysTicketsEl.textContent = '—';
    }

    try {
      const pendingSnap = await ticketsRef
        .where('servedAt', '==', null)
        .get();
      pendingQueuesEl.textContent = pendingSnap.size;
    } catch (e) {
      console.error('Error loading pending queues:', e);
      pendingQueuesEl.textContent = '—';
    }

    // —————— 3) Recent Activity Table ——————
    clearRecent();
    try {
      const recentSnap = await ticketsRef
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      recentSnap.forEach(doc => {
        const d = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDate(d.createdAt)}</td>
          <td>${d.counter || '—'}</td>
          <td>${d.number}</td>
          <td>${d.servedAt ? 'Served' : d.skippedAt ? 'Skipped' : 'Waiting'}</td>
        `;
        recentBody.appendChild(tr);
      });
    } catch (e) {
      console.error('Error loading recent activity:', e);
    }

    // —————— 4) Daily Queue Volume Chart (last 7 days) ——————
    const labels7 = [];
    const data7   = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0,0,0,0);
      dayStart.setDate(dayStart.getDate() - i);
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);

      labels7.push(dayStart.toLocaleDateString());
      try {
        const snap = await ticketsRef
          .where('createdAt', '>=', dayStart)
          .where('createdAt', '<',  nextDay)
          .get();
        data7.push(snap.size);
      } catch (e) {
        console.error(`Error loading day ${labels7[labels7.length-1]}:`, e);
        data7.push(0);
      }
    }
    new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: labels7,
        datasets: [{
          label: 'Tickets/day',
          data: data7,
          fill: false,
          tension: 0.3
        }]
      },
      options: {
        scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Count' } } }
      }
    });

    // —————— 5) Counter Comparison Chart ——————
    try {
      const allSnap = await ticketsRef.get();
      const counterCounts = {};
      allSnap.forEach(doc => {
        const c = doc.data().counter || '—';
        counterCounts[c] = (counterCounts[c] || 0) + 1;
      });
      new Chart(counterCompCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(counterCounts),
          datasets: [{
            label: 'Tickets by Counter',
            data: Object.values(counterCounts)
          }]
        },
        options: {
          scales: { x: { title: { display: true, text: 'Counter' } }, y: { title: { display: true, text: 'Count' } } }
        }
      });
    } catch (e) {
      console.error('Error loading counter comparison:', e);
    }
  });
})();
