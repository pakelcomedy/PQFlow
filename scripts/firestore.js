// scripts/firestore.js
// ————————————————————————————————
// FIREBASE INITIALIZATION
// ————————————————————————————————
const firebaseConfig = {
  apiKey: "AIzaSyB0hy4PSyq6P_0g7sZLN6cQKvRk6QqtQ7w",
  authDomain: "pqflow.firebaseapp.com",
  projectId: "pqflow",
  storageBucket: "pqflow.appspot.com",
  messagingSenderId: "961278014854",
  appId: "1:961278014854:web:c229473df8791789182807",
  measurementId: "G-16TT21TJ73"
};

// Init only if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase App initialized.");
} else {
  console.log("ℹ️ Firebase already initialized.");
}

// Optional: Analytics
if (firebase.analytics) {
  firebase.analytics();
}

// Init Firestore & Auth
const db   = firebase.firestore();
const auth = firebase.auth();

// Make globals available
window.firebase = firebase;
window.db       = db;
window.auth     = auth;

// Optional helper: initFirestore (used in auth.js/settings.js)
function initFirestore() {
  if (!window.db) {
    window.db = firebase.firestore();
  }
}
window.initFirestore = initFirestore;

console.log("✅ Firestore & Auth initialized.");
