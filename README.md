# 💡 PQFlow Pro: Virtual Queue System — Unified & Advanced

## 🎯 Purpose

PQFlow Pro is a secure, scalable, and fully client-side virtual queue system designed for commercial use in hospitals, workshops, pharmacies, public services, and more. Users join with a simple QR code scan or link click—no apps or forms needed. Admins manage multiple branches, services, and counters via Firebase, all hosted on GitHub Pages.

```
PQFlow/
├── pages/
│   ├── login.html            # Halaman login admin
│   ├── register.html            # Halaman login admin
│   ├── forgot-password.html            # Halaman login admin
│   ├── admin.html            # Panel kontrol admin per cabang/layanan
│   ├── dashboard.html        # Dashboard multi-cabang untuk superadmin
│   └── tv.html               # Mode fullscreen untuk display nomor panggilan
├── index.html                # Halaman utama user (auto-join via QR/link)
├── manifest.json             # PWA manifest
├── service-worker.js         # Service Worker (Workbox) untuk offline
├── firebase.json             # Konfigurasi Firebase (rules, hosting, etc.)
├── README.md                 # Dokumentasi proyek dan setup
├── ROADMAP.md                # Rencana pengembangan & fitur roadmap
├── package.json              # (Opsional) untuk Workbox build & dev scripts
├── scripts/
│   ├── firestore.js          # Inisialisasi Firebase & Firestore SDK
│   ├── auth.js               # Logic Firebase Auth (login/logout/register/forgot password)
│   ├── user.js               # Logic auto-join & status user
│   ├── admin.js              # Logic kontrol antrian admin
│   ├── tv.js                 # Logic display untuk TV mode
│   ├── pwa.js                # Registrasi Service Worker & caching
│   └── utils.js              # Helper: enkripsi AES, CSV export, QR generator, dsb.
├── lang/
│   ├── en.json               # String bahasa Inggris
│   └── id.json               # String bahasa Indonesia
├── styles/
│   └── style.css             # CSS global (Tailwind/vanilla)

└── .github/
    └── workflows/
        └── deploy.yml        # GitHub Actions untuk deploy ke Pages
```
---

## 👥 Roles & Permissions

| Role         | Capabilities                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **User**     | • Scan QR / click link → auto-join queue<br>• View own number, position & progress (real-time)<br>• Check status anytime via saved link |
| **Admin**    | • Secure login (Firebase Auth)<br>• Manage queues per branch & service<br>• Manual check-in for walk-ins<br>• Call, skip, complete, reset queues<br>• Export history (CSV/JSON) |
| **Superadmin** | • Oversee all branches & services<br>• View global statistics & logs                          |

---

## 🧩 Core Features

1. **Auto-Join via QR/Link**  
   - URL format:  
     ```
     https://pqflow.web.id/?autoJoin=true&branch=<branchId>&service=<serviceId>
     ```
   - Generates encrypted queue entry, stores in Firestore & localStorage.

2. **Encrypted Queue Data**  
   - All queue metadata (number, branch, service, timestamps) AES-encrypted client-side.

3. **Multi-Branch & Multi-Admin Support**  
   - Role-based access control (branch admins vs. superadmins).  
   - Admins see only their branch’s queues; superadmins see all.

4. **User Progress Bar**  
   - “You are position 7 of 23” displayed as a dynamic progress bar.  
   - Updated in real time from Firestore’s `currentNumber`.

5. **Real-time Updates**  
   - Firestore `onSnapshot()` for instant queue status on user and admin screens.

6. **Multi-Language (EN & ID)**  
   - JSON-based strings (`lang/en.json`, `lang/id.json`).  
   - Language preference saved in localStorage; toggle in UI.

7. **Export Queue History**  
   - Admins download today’s or week’s data as CSV or JSON.  
   - Client-side JS reads Firestore, creates Blob, triggers download.

8. **Manual Check-In Mode**  
   - For walk-in customers: admin inputs name, branch, service.  
   - Entry flagged `source: "manual"` in Firestore.

9. **Offline Mode (PWA)**  
   - `manifest.json` + Workbox service worker caches assets & latest queue state.  
   - Users can view status even without internet.

10. **Branch Opening Hours**  
    - Admins set operating hours (`branches/{id}/hours`: `{ start: "08:00", end: "17:00" }`).  
    - Outside hours, users see “Service Not Yet Open”.

11. **Smart Queue Distribution**  
    - For services with multiple counters, auto-assign next queue to the counter with fewest waiting.  
    - Uses Firestore subcollection `counters/{counterId}/queueNumbers`.

12. **Emergency / Priority Mode**  
    - Admins can flag urgent entries.  
    - Priority queues are called before regular ones.

13. **Single Queue per Device per Day**  
    - Enforced via encrypted localStorage flag & Firestore lookup.

14. **TV Mode Display**  
    - Fullscreen view showing the currently called number, customizable per branch/service.

---

## 🧠 Firestore Data Schema (Example)

```jsonc
// branches/{branchId}
{
  "name": "RS Jakarta",
  "hours": {
    "start": "08:00",
    "end": "17:00"
  }
}

// admins/{uid}
{
  "branchId": "rs-jkt",
  "role": "admin" // or "superadmin"
}

// queues/{queueId}
{
  "queueNumber": 25,
  "status": "waiting",        // waiting | called | skipped | done
  "branchId": "rs-jkt",
  "service": "general",
  "createdAt": Timestamp,
  "priority": false,
  "source": "qr",             // or "manual"
  "encryptedData": "<AES…>"
}

// counters/{counterId}
{
  "branchId": "rs-jkt",
  "service": "general",
  "queueNumbers": [1, 5, 9]
}
