(function() {
  // ————————————————————————————————
  // CONFIG: Base path (untuk GH Pages sub-path)
  // ————————————————————————————————
  const BASE_PATH = '/' + (location.pathname.split('/')[1] || '').replace(/\/$/, '');

  // ————————————————————————————————
  // INIT FIRESTORE & AUTH
  // ————————————————————————————————
  if (typeof initFirestore === 'function') initFirestore();
  const auth = firebase.auth();
  const db   = firebase.firestore();

  // ————————————————————————————————
  // HELPER STATUS MESSAGE
  // ————————————————————————————————
  const show = window.showMessage || function(el, msg, type) {
    el.textContent = msg;
    el.classList.toggle('info',    type === 'info');
    el.classList.toggle('success', type === 'success');
    el.classList.toggle('error',   type === 'error');
  };

  // ————————————————————————————————
  // REGISTRATION: simpan org & buat akun
  // ————————————————————————————————
  (function initRegistration() {
    const form  = document.getElementById('register-form');
    const msgEl = document.getElementById('register-message');
    if (!form || !msgEl) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      msgEl.textContent = '';
      msgEl.className = 'status-message';

      const orgInp  = document.getElementById('org-name');
      const email   = document.getElementById('email').value.trim();
      const pw      = document.getElementById('password').value;
      const cpw     = document.getElementById('confirm-password').value;
      const org     = orgInp.value.trim();

      if (!org || !email || !pw || pw !== cpw) {
        return show(msgEl, 'Please fill all fields correctly.', 'error');
      }

      try {
        show(msgEl, 'Registering…', 'info');
        sessionStorage.setItem('pendingOrg', org);
        sessionStorage.removeItem('profileInited');

        await auth.createUserWithEmailAndPassword(email, pw);
        show(msgEl, 'Account created! Finalizing…', 'info');
        // redirect akan terjadi di onAuthStateChanged
      } catch (err) {
        console.error('Registration Error:', err);
        show(msgEl, err.message || 'Registration failed.', 'error');
      }
    });
  })();

  // ————————————————————————————————
  // GLOBAL AUTH STATE HANDLER
  // ————————————————————————————————
  auth.onAuthStateChanged(async user => {
    const path = location.pathname;
    const onAuthPage  = new RegExp(`^${BASE_PATH}/pages/auth/`).test(path);
    const onAdminPage = new RegExp(`^${BASE_PATH}/pages/admin/`).test(path);

    const pendingOrg    = sessionStorage.getItem('pendingOrg');
    const profileInited = sessionStorage.getItem('profileInited');

    // 1) Inisialisasi profile baru setelah registrasi
    if (user && pendingOrg && !profileInited) {
      try {
        const uid = user.uid;
        await db.collection('admins').doc(uid).set({
          organization: pendingOrg,
          email:        user.email,
          role:         'admin',
          createdAt:    firebase.firestore.FieldValue.serverTimestamp()
        });
        await db
          .collection('users').doc(uid)
          .collection('settings').doc('config')
          .set({
            systemName: pendingOrg,
            hoursMode:  'custom',
            openTime:   '08:00',
            closeTime:  '17:00',
            updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
          });
        console.log('✅ Profile & settings initialized');

        sessionStorage.setItem('profileInited', '1');
        sessionStorage.removeItem('pendingOrg');

        // redirect ke Admin dashboard
        location.href = `${BASE_PATH}/pages/admin/index.html`;
        return;
      } catch (err) {
        console.error('Init profile failed:', err);
      }
    }

    // 2) Route guard: 
    if (user && onAuthPage) {
      location.replace(`${BASE_PATH}/pages/admin/index.html`);
    } else if (!user && onAdminPage) {
      location.replace(`${BASE_PATH}/pages/auth/login.html`);
    }
  });

  // ————————————————————————————————
  // LOGIN
  // ————————————————————————————————
  (function initLogin() {
    const form  = document.getElementById('login-form');
    const msgEl = document.getElementById('login-message');
    if (!form || !msgEl) return;

    const btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = form['email'].value.trim();
      const pw    = form['password'].value;
      if (!email || !pw) {
        return show(msgEl, 'Email dan password wajib diisi.', 'error');
      }
      btn.disabled = true;
      show(msgEl, 'Logging in…', 'info');
      try {
        await auth.signInWithEmailAndPassword(email, pw);
        show(msgEl, 'Login successful! Redirecting…', 'success');
      } catch (err) {
        console.error('Login Error:', err);
        show(msgEl, err.message || 'Login failed.', 'error');
      } finally {
        setTimeout(() => btn.disabled = false, 2000);
      }
    });
  })();

  // ————————————————————————————————
  // FORGOT & RESET
  // ————————————————————————————————
  (function initForgot() {
    const form  = document.getElementById('fp-form');
    const msgEl = document.getElementById('fp-message');
    if (!form || !msgEl) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = form['fp-email'].value.trim();
      if (!email) return show(msgEl, 'Email wajib diisi.', 'error');

      try {
        show(msgEl, 'Sending reset link…', 'info');
        await auth.sendPasswordResetEmail(email);
        show(msgEl, 'Reset link sent! Check your inbox.', 'success');
        setTimeout(() => location.href = `${BASE_PATH}/pages/auth/login.html`, 1500);
      } catch (err) {
        console.error('Reset Error:', err);
        show(msgEl, err.message || 'Reset failed.', 'error');
      }
    });
  })();

  // ————————————————————————————————
  // LOGOUT
  // ————————————————————————————————
  (function initLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        await auth.signOut();
        location.href = `${BASE_PATH}/pages/auth/login.html`;
      } catch (err) {
        console.error('Logout Error:', err);
        const msgEl = document.querySelector('.status-message');
        show(msgEl, 'Logout failed.', 'error');
        btn.disabled = false;
      }
    });
  })();
})();
