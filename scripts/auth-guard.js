// File: scripts/auth-guard.js

// Pastikan Firebase SDK & firestore.js sudah dimuat terlebih dahulu
firebase.auth().onAuthStateChanged(user => {
  const path = window.location.pathname;
  // Jika belum login, dan URL berada di folder /pages/admin/
  if (!user && path.includes('/pages/admin/')) {
    // Redirect ke login
    window.location.replace('../auth/login.html');
  }
  // Jika sudah login, dan URL berada di folder /pages/auth/
  if (user && path.includes('/pages/auth/')) {
    window.location.replace('../admin/index.html');
  }
});
