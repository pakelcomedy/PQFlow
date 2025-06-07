# Roadmap for PQFlow (QLine Pro)

This document outlines the high-level development phases and feature sets for the PQFlow Virtual Queue System. Each phase groups related capabilities to guide incremental delivery and testing.

---

## Table of Contents

1. [Phase 1: Project Setup & Core Infrastructure](#phase-1-project-setup--core-infrastructure)  
2. [Phase 2: Basic Queue Functionality](#phase-2-basic-queue-functionality)  
3. [Phase 3: Admin & Superadmin Features](#phase-3-admin--superadmin-features)  
4. [Phase 4: Security, Encryption & Roles](#phase-4-security-encryption--roles)  
5. [Phase 5: User Experience Enhancements](#phase-5-user-experience-enhancements)  
6. [Phase 6: Data Export & Reporting](#phase-6-data-export--reporting)  
7. [Phase 7: Multi-Language & Localization](#phase-7-multi-language--localization)  
8. [Phase 8: Progressive Web App & Offline Support](#phase-8-progressive-web-app--offline-support)  
9. [Phase 9: Advanced Queue Distribution & Priority](#phase-9-advanced-queue-distribution--priority)  
10. [Phase 10: Monitoring, Analytics & Scalability](#phase-10-monitoring-analytics--scalability)  

---

### Phase 1: Project Setup & Core Infrastructure
- Initialize GitHub Pages repository  
- Configure Firebase project (Firestore, Auth)  
- Setup project structure (folders: `pages/`, `scripts/`, `lang/`, `styles/`, `assets/`)  
- Add basic HTML templates: `index.html`, `login.html`, `admin.html`, `dashboard.html`, `tv.html`  
- Integrate Firestore SDK and Firebase Auth in `scripts/firestore.js` and `scripts/auth.js`  
- Create `manifest.json`, `service-worker.js` for PWA base  

---

### Phase 2: Basic Queue Functionality
- Implement **Auto-Join** via QR/link (`?autoJoin=true&branch=&service=`)  
- Store queue entries in Firestore with encrypted payload placeholder  
- Display user’s queue number and status in `index.html`  
- Persist user’s queue reference in encrypted `localStorage`  

---

### Phase 3: Admin & Superadmin Features
- Build **Admin Panel** (`pages/admin.html`):  
  - Login/logout flows  
  - List and control queue items (call⎯skip⎯complete)  
  - Manual “Check-in” form for walk-in customers  
- Build **Dashboard** (`pages/dashboard.html`) for superadmins:  
  - Overview across all branches  
  - Branch/service filtering  

---

### Phase 4: Security, Encryption & Roles
- Integrate client-side AES encryption (CryptoJS / WebCrypto) for queue data  
- Define Firestore security rules enforcing:  
  - Admin-only writes/updates  
  - Role-based access (admin vs superadmin)  
- Store admin profiles in Firestore (`admins` collection) with `branchId` and `role`  

---

### Phase 5: User Experience Enhancements
- Add **Progress Bar** showing “Position X of Y” (using currentNumber from Firestore)  
- Real-time updates via `onSnapshot()` listeners in `scripts/user.js`  
- Implement **TV Mode** display (`pages/tv.html`) showing current call in fullscreen  

---

### Phase 6: Data Export & Reporting
- Build **Export** feature in Admin Panel:  
  - Query Firestore for today’s or week’s queues  
  - Convert to CSV or JSON Blob in-browser  
  - Trigger file download  
- Add **Export History** section in dashboard view  

---

### Phase 7: Multi-Language & Localization
- Create `lang/en.json` and `lang/id.json` for all UI strings  
- Implement language switcher widget, store preference in `localStorage`  
- Load and inject localized strings on page render  

---

### Phase 8: Progressive Web App & Offline Support
- Finalize `manifest.json` (icons, display, start_url)  
- Configure Workbox in `service-worker.js` for:  
  - Caching shell assets  
  - Offline queue status from last snapshot  
- Test offline UX: user can view last known state  

---

### Phase 9: Advanced Queue Distribution & Priority
- Model multiple counters per service using Firestore subcollections (`counters/{id}/queueNumbers`)  
- Implement **Smart Distribution**: assign new entries to the counter with the shortest queue  
- Add **Priority Flag** for emergency cases; prioritize in call order  

---

### Phase 10: Monitoring, Analytics & Scalability
- Integrate lightweight analytics (e.g. Google Analytics or Firebase Analytics) for:  
  - Queue volume trends  
  - Average wait times  
- Implement error logging and alerting for PWA failures  
- Review Firestore cost and optimize indexes/reads for scale  

---

> **Note:** Each phase can be broken down into sprints or tracked in your preferred task management tool. Adjust priorities as you onboard commercial clients and gather feedback.  
