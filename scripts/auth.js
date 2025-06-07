// File: scripts/auth.js

// ————————————————————————————————
// Ensure Firestore is initialized (from firestore.js)
if (typeof initFirestore === 'function') {
  initFirestore();
}

// Helper to show status messages
const show = window.showMessage || function(el, msg, type) {
  el.textContent = msg;
  el.classList.remove('success', 'error', 'info');
  el.classList.add(type);
};

// ————————————————————————————————
// REGISTRATION
// ————————————————————————————————
const regForm = document.getElementById('register-form');
if (regForm) {
  const msgEl = document.getElementById('register-message');
  regForm.addEventListener('submit', async e => {
    e.preventDefault();
    const org   = document.getElementById('org-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const pw    = document.getElementById('password').value;
    const cpw   = document.getElementById('confirm-password').value;

    if (!org || !email || !pw || pw !== cpw) {
      show(msgEl, 'Please fill all fields correctly.', 'error');
      return;
    }

    try {
      show(msgEl, 'Registering…', 'info');
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, pw);
      await db.collection('admins').doc(cred.user.uid).set({
        organization: org,
        email,
        role: 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      show(msgEl, 'Success! Redirecting…', 'success');
      setTimeout(() => location.href = 'index.html', 1500);
    } catch (err) {
      console.error(err);
      show(msgEl, err.message, 'error');
    }
  });
}

// ————————————————————————————————
// LOGIN
// ————————————————————————————————
const loginForm = document.getElementById('login-form');
if (loginForm) {
  const msgEl = document.getElementById('login-message');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const pw = document.getElementById('password').value;

    // Validasi sederhana
    if (!email || !pw) {
      show(msgEl, 'Email dan password wajib diisi.', 'error');
      return;
    }

    // Nonaktifkan tombol agar tidak diklik berkali-kali
    submitBtn.disabled = true;
    show(msgEl, 'Sedang masuk…', 'info');

    try {
      await firebase.auth().signInWithEmailAndPassword(email, pw);
      show(msgEl, 'Berhasil masuk! Mengalihkan…', 'success');
      setTimeout(() => location.href = 'index.html', 1000);
    } catch (err) {
      console.error(err);

      // Tangani error umum Firebase Auth
      switch (err.code) {
        case 'auth/invalid-email':
          show(msgEl, 'Format email tidak valid.', 'error');
          break;
        case 'auth/user-not-found':
          show(msgEl, 'Pengguna tidak ditemukan.', 'error');
          break;
        case 'auth/wrong-password':
          show(msgEl, 'Password salah.', 'error');
          break;
        case 'auth/too-many-requests':
          show(msgEl, 'Terlalu banyak percobaan login. Coba lagi nanti.', 'error');
          break;
        case 'auth/network-request-failed':
          show(msgEl, 'Gagal terhubung ke server. Periksa koneksi Anda.', 'error');
          break;
        default:
          show(msgEl, err.message || 'Terjadi kesalahan.', 'error');
      }
    } finally {
      // Aktifkan kembali tombol setelah 3 detik (kecuali terlalu banyak request)
      if (err?.code === 'auth/too-many-requests') {
        setTimeout(() => (submitBtn.disabled = false), 3 * 60 * 1000); // 3 menit
      } else {
        setTimeout(() => (submitBtn.disabled = false), 2000);
      }
    }
  });
}

// ————————————————————————————————
// FORGOT & RESET (Firebase built-in)
// ————————————————————————————————
const fpForm = document.getElementById('fp-form');
if (fpForm) {
  const msgEl   = document.getElementById('fp-message');
  const emailEl = document.getElementById('fp-email');

  fpForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = emailEl.value.trim();

    if (!email) {
      show(msgEl, 'Email wajib diisi.', 'error');
      return;
    }

    try {
      show(msgEl, 'Mengirim link reset…', 'info');
      await firebase.auth().sendPasswordResetEmail(email);
      show(msgEl, 'Link reset terkirim! Cek email Anda.', 'success');
      setTimeout(() => location.href = 'login.html', 2000);
    } catch (err) {
      console.error(err);
      switch (err.code) {
        case 'auth/invalid-email':
          show(msgEl, 'Format email tidak valid.', 'error');
          break;
        case 'auth/user-not-found':
          show(msgEl, 'Pengguna tidak ditemukan.', 'error');
          break;
        case 'auth/network-request-failed':
          show(msgEl, 'Gagal terhubung. Periksa koneksi Anda.', 'error');
          break;
        default:
          show(msgEl, err.message || 'Terjadi kesalahan.', 'error');
      }
    }
  });
}

// ————————————————————————————————
// GLOBAL REDIRECTS
// ————————————————————————————————
firebase.auth().onAuthStateChanged(u => {
  const p       = location.pathname;
  const onAuth  = /\/pages\/auth\//.test(p);
  const onAdmin = /\/pages\/admin\//.test(p);

  if (u && onAuth)        location.replace('../admin/index.html');
  else if (!u && onAdmin) location.replace('../auth/login.html');
});

// ————————————————————————————————
// LOGOUT HANDLER
// ————————————————————————————————
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      logoutBtn.disabled = true;
      await firebase.auth().signOut();
      // optional: clear localStorage/session data here
      window.location.href = '../auth/login.html';
    } catch (err) {
      console.error('Logout Error:', err);
      const msgEl = document.querySelector('.status-message');
      if (msgEl) show(msgEl, 'Logout failed. Try again.', 'error');
      logoutBtn.disabled = false;
    }
  });
}
