const firebaseConfig = {
  apiKey: "AIzaSyB0hy4PSyq6P_0g7sZLN6cQKvRk6QqtQ7w",
  authDomain: "pqflow.firebaseapp.com",
  projectId: "pqflow",
  storageBucket: "pqflow.appspot.com",
  messagingSenderId: "961278014854",
  appId: "1:961278014854:web:c229473df8791789182807",
  measurementId: "G-16TT21TJ73"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Initialize Analytics (optional)
if (firebase.analytics) {
  firebase.analytics();
}

// Initialize Firestore & Auth
const db   = firebase.firestore();
const auth = firebase.auth();

// Make globals available
window.firebase = firebase;
window.db       = db;
window.auth     = auth;

// Ready!
console.log("✅ Firestore initialized, Auth initialized.");
