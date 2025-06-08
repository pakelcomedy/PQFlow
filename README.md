# PQFlow Pro

> **Virtual Queue System** — No apps, no forms. Just scan a QR‑Code or click a link, get your number, and watch live updates.

---

## 🚀 Quick Start

1. **Clone & Deploy**  
   ```
   git clone https://github.com/pakelcomedy/pqflow.git
   cd pqflow
   # configure Firebase in firebase.json / scripts/firestore.js
   npm install         # (optional, if using Workbox build scripts)
   npm run build       # generate service‑worker, etc.
   # push to GitHub Pages or any static host
   ```

2. **Register Admin**
   Browse `/pages/auth/register.html`, fill organization name + email/password → you’re redirected to `/pages/admin/index.html`.

3. **Generate Join Link**
   In **Settings**, click **Generate Link & QR‑Code** → you’ll get:

   ```
   http://127.0.0.1:3000/index.html?org=<yourOrgId>
   ```

   Share that QR or link with customers.

4. **User Joins**
   Customer scans or clicks, lands on `/index.html?org=<orgId>`, taps **Confirm** → ticket created atomically in Firestore → redirected to `/pages/tv.html?org=<orgId>&ticket=<ticketId>`.

5. **TV Display**
   `/pages/tv.html?org=<orgId>&ticket=<ticketId>` shows only that one ticket’s number, keeps it on refresh, plus live clock.

6. **Admin Dashboard**
   `/pages/admin/index.html` → select counter → real‑time waiting list (all unserved tickets assigned to this org), call/skip/reset per counter.

---

## 📂 Project Layout

```
PQFlow/
├── index.html                    # Public join page (auto‑join via ?org=)
├── pages/
│   ├── auth/
│   │   ├── login.html
│   │   ├── register.html
│   │   └── forgot-password.html
│   ├── admin/
│   │   ├── index.html            # Manage queues per counter
│   │   ├── dashboard.html        # Superadmin stats
│   │   ├── history.html
│   │   ├── export.html
│   │   └── settings.html         # Org settings & QR link
│   └── tv.html                   # TV‑mode single ticket display
├── scripts/
│   ├── firestore.js              # Firebase init (compat)
│   ├── auth.js                   # Registration/login/reset
│   ├── user.js                   # index.html join logic
│   ├── tv.js                     # TV‑mode ticket listener + clock
│   ├── utils.js                  # helpers (format/date)
│   ├── pwa.js                    # service‑worker registration
│   └── i18n.js                   # language toggle (EN/ID)
├── scripts/admin/
│   ├── settings.js               # Settings page: hours, counters, QR/link
│   ├── admin.js                  # Admin queue controls per counter
│   └── dashboard.js              # Superadmin charts & metrics
├── styles/
│   ├── style.css                 # Public + shared
│   └── admin/
│       ├── admin.css             # admin index, settings
│       └── dashboard.css         # charts & metrics
├── manifest.json                 # PWA manifest
├── service-worker.js             # Workbox precache
├── firebase.json                 # Firebase Hosting + rules
├── .github/workflows/deploy.yml  # GH Actions → Pages
└── README.md                     # THIS FILE
```

---

## 🔑 Key Concepts & Updates

### 1. Single‑Link, Multi‑Join

* **`/index.html?org=<orgId>`**
  One URL per organization → unlimited joins.
* Client calls Firestore transaction:

  1. bump `organizations/{orgId}/counters/current`
  2. create `organizations/{orgId}/tickets/{ticketId}`
* Redirect to **TV Mode** for that ticket.

### 2. TV Mode

* **`/pages/tv.html?org=<orgId>&ticket=<ticketId>`**

  * Listens via `onSnapshot` to that one ticket doc.
  * Displays **ticket.number**, updates live.
  * Shows a live clock.
  * Uses `sessionStorage` guard: refresh doesn’t re‑issue a new ticket.

### 3. Admin Controls

* Fetch all **unserved** tickets under `organizations/{orgId}/tickets`:

  * real‑time listener with `servedAt == null`.
* **Select Counter** from per‑org `settings/config/counters`.
* **Call Next**: pick earliest ticket (by `createdAt`), display its number.
* **Skip** / **Reset** actions update Firestore timestamps.

### 4. Settings & QR Link

* Under `users/{uid}/settings/config` store:

  * `systemName`, `hoursMode`, `openTime`/`closeTime`.
  * Subcollection `counters/{counterId}` for per‑org counters.
* “Generate Link” builds:

  ```
  http://127.0.0.1:3000/index.html?org=<uid>
  ```

  * QR via QRCode.js.

### 5. Firestore Schema Overview

```
// organizations/{orgId}/counters/current
{ current: 42 }

// organizations/{orgId}/tickets/{ticketId}
{
  number:    43,
  createdAt: Timestamp,
  servedAt:  null|Timestamp,
  skippedAt: null|Timestamp,
  counter:   <counterId|null>
}

// users/{adminUid}/settings/config
{
  systemName: "My Clinic",
  hoursMode:  "custom",
  openTime:   "08:00",
  closeTime:  "17:00"
}

// users/{adminUid}/settings/config/counters/{ctrId}
{
  label: "Counter A",
  updatedAt: Timestamp
}
```

---

## 📝 Change Log Highlights

* **v2.0**
  – Switched to **organizations/** path; unified tickets & counters under each org.
  – Single join URL, no per‑service links.
  – Atomic transaction for new tickets + counter bump.
  – TV‑mode redirect with ticket‑specific listener.
  – Admin JS cleaned: optional “Back” button removed; controls auto‑disable when no counter.
  – Settings page: live QR+link, per‑org counters subcollection.
  – Dashboard (superadmin) moved under `scripts/admin/dashboard.js`.
  – Updated Firestore indexes for composite queries (servedAt + createdAt).

---

## ⚙️ Deployment & Indexes

* **Firestore Indexes**

  * Composite on `organizations/{orgId}/tickets` for queries:

    ```
    {
      "collectionGroup": "tickets",
      "fields": [
        { "fieldPath": "servedAt",   "order": "ASCENDING" },
        { "fieldPath": "createdAt",  "order": "ASCENDING" }
      ]
    }
    ```
  * Optional: index on `counter` + `servedAt` + `createdAt` if per‑counter filter.

* **GitHub Pages**

  * `.github/workflows/deploy.yml` auto‑deploys `main` branch to `gh-pages`.

---

### 🙏 Thanks for using PQFlow Pro!

Questions or issues, open an issue on GitHub.
