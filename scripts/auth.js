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
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const pw    = document.getElementById('password').value;

    if (!email || !pw) {
      show(msgEl, 'Email & password required.', 'error');
      return;
    }

    try {
      show(msgEl, 'Signing in…', 'info');
      await firebase.auth().signInWithEmailAndPassword(email, pw);
      show(msgEl, 'Logged in! Redirecting…', 'success');
      setTimeout(() => location.href = 'index.html', 800);
    } catch (err) {
      console.error(err);
      show(msgEl, err.message, 'error');
    }
  });
}

// ————————————————————————————————
// FORGOT & RESET (OTP flow)
// ————————————————————————————————
const fpForm = document.getElementById('fp-form');
if (fpForm) {
  const msgEl   = document.getElementById('fp-message');
  const emailEl = document.getElementById('fp-email');
  const otpEl   = document.getElementById('fp-otp');
  const passEl  = document.getElementById('fp-password');
  const cpassEl = document.getElementById('fp-confirm');
  const btnOtp  = document.getElementById('send-otp-btn');
  let otpEmail  = null, otpTimer = null;

  const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  // Send OTP
  btnOtp.addEventListener('click', async () => {
    const email = emailEl.value.trim();
    if (!email) {
      show(msgEl, 'Enter email first.', 'error');
      return;
    }
    btnOtp.disabled = true;
    show(msgEl, 'Sending OTP…', 'info');

    try {
      const code = genOTP();
      await db.collection('password_reset').doc(email).set({
        otp: code,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      otpEmail = email;
      console.log('DEBUG OTP:', code);
      show(msgEl, 'OTP sent! Check console/email.', 'success');

      // countdown
      let t = 60;
      btnOtp.textContent = `Resend in ${t}s`;
      otpTimer = setInterval(() => {
        t--;
        if (t <= 0) {
          clearInterval(otpTimer);
          btnOtp.textContent = 'Send OTP';
          btnOtp.disabled = false;
        } else {
          btnOtp.textContent = `Resend in ${t}s`;
        }
      }, 1000);

    } catch (err) {
      console.error(err);
      show(msgEl, 'Failed to send OTP.', 'error');
      btnOtp.disabled = false;
      btnOtp.textContent = 'Send OTP';
    }
  });

  // Verify + Reset
  fpForm.addEventListener('submit', async e => {
    e.preventDefault();
    const otp  = otpEl.value.trim();
    const pw   = passEl.value;
    const cpw  = cpassEl.value;

    if (!otpEmail) {
      show(msgEl, 'Request an OTP first.', 'error');
      return;
    }
    if (!otp || !pw || pw !== cpw) {
      show(msgEl, 'Check OTP & passwords.', 'error');
      return;
    }

    try {
      show(msgEl, 'Verifying…', 'info');
      const doc = await db.collection('password_reset').doc(otpEmail).get();
      if (!doc.exists || doc.data().otp !== otp) {
        throw new Error('Invalid OTP');
      }
      await db.collection('password_reset').doc(otpEmail).delete();
      await firebase.auth().sendPasswordResetEmail(otpEmail);
      show(msgEl, 'Reset link sent! Check email.', 'success');
      setTimeout(() => location.href = 'login.html', 2000);
    } catch (err) {
      console.error(err);
      show(msgEl, err.message, 'error');
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
