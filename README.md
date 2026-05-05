# ProximityProtect

> A real-time child safety monitoring system with live location tracking, geo-fencing, route history, and instant alerts.

![Status](https://img.shields.io/badge/status-academic%20project-2196F3)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-4CAF50)
![Backend](https://img.shields.io/badge/backend-Firebase%20%7C%20Firestore-FF9800)
![Map](https://img.shields.io/badge/maps-Leaflet-2E7D32)

<img width="1326" height="707" alt="Image" src="https://github.com/user-attachments/assets/74ba7c99-b10c-491d-948d-691bf56a7ced" />

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Usage Flow](#usage-flow)
- [Architecture](#architecture)
- [Core Code Highlights](#core-code-highlights)
- [Screenshots](#screenshots)
- [Known Limitations](#known-limitations)
- [Future Enhancements](#future-enhancements)

---

## Overview

ProximityProtect is a web-based software engineering project built to help parents monitor their child’s location in real time. It provides a live tracking dashboard, safe-zone creation through geo-fences, route history, and instant alerts when a child enters or exits a defined boundary.

The project uses:

- a responsive landing page for product presentation
- a tracking dashboard for real-time monitoring
- Firebase Authentication for lightweight session access
- Cloud Firestore for live backend synchronization
- Leaflet and Leaflet Draw for map rendering and geo-fence management

---

## Key Features

- Real-time child location tracking across devices
- Parent-child session connection using a shared family code
- Circle, rectangle, and polygon geo-fence creation
- Entry and exit boundary alerts
- Recent movement / route history
- Demo route mode for testing without physical movement
- Responsive UI with mobile hamburger navigation
- Browser notification support for alerts

---

## How It Works

<img width="1148" height="917" alt="Image" src="https://github.com/user-attachments/assets/0ec5d0b3-a5ae-4a79-b921-ccf3a9241f62" />

##

1. The parent and child open the tracking dashboard on separate devices.
2. Both devices enter the same family code.
3. The child device shares live GPS data.
4. The parent dashboard listens to live Firestore updates.
5. The system checks whether the child is inside or outside any safe zone.
6. Alerts and route history are updated in real time.

---

## Project Structure

```text
website/
├── index.html
├── tracking.html
├── .env.example
├── .gitignore
├── assets/
│   ├── images/
│   │   ├── Hero.jpg
│   │   └── logo.png
│   ├── scripts/
│   │   └── tracking.js
│   └── styles/
│       ├── style.css
│       └── tracking.css
├── config/
│   ├── firebase-config.js
│   └── firebase-config.local.example.js
├── docs/
│   ├── APPLICATION_USAGE_AND_VERIFICATION.txt
│   ├── FIREBASE_SETUP.md
│   └── PROJECT_REPORT.md
├── scripts/
│   └── generate-firebase-config.ps1
└── README.md
```

---

## Tech Stack
![HTML](https://img.shields.io/badge/HTML-orange?style=for-the-badge&logo=html5)
![CSS](https://img.shields.io/badge/CSS-blue?style=for-the-badge&logo=css3)
![JavaScript](https://img.shields.io/badge/JavaScript-yellow?style=for-the-badge&logo=javascript)
![Firebase](https://img.shields.io/badge/Firebase-Backend-orange?style=for-the-badge&logo=firebase)
![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green?style=for-the-badge)

---

## Getting Started

### 1. Open the project folder

Use the project from the `website` directory.

### 2. Configure Firebase

Add your Firebase web app credentials to `.env`, then generate the local browser config.

### 3. Enable required Firebase services

- Anonymous Authentication
- Cloud Firestore

### 4. Serve the project

Run the project using a local web server or host it.  
Do not rely on opening the HTML file directly from disk for final testing.

### 5. Open the main pages

- Landing page: `index.html`
- Tracking dashboard: `tracking.html`

---

## Firebase Setup

Quick summary:

- Create a Firebase project
- Add a web app
- Put the Firebase values into `.env`
- Run `.\scripts\generate-firebase-config.ps1`
- Enable Anonymous Auth
- Enable Firestore
- Apply the starter rules from `docs/FIREBASE_SETUP.md`

<details>
<summary><strong>Starter Firestore Rules</strong></summary>

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyCode} {
      allow read, write: if request.auth != null;
    }

    match /families/{familyCode}/history/{historyId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

</details>

For the full setup guide, see `docs/FIREBASE_SETUP.md`

---

## Usage Flow

### Parent Device

- Open `tracking.html`
- Enter a family code
- Enter the child name
- Click **Connect as Parent**
- Wait for live location and route updates

### Child Device

- Open `tracking.html`
- Enter the same family code
- Enter the same child name
- Click **Share This Device as Child**
- Allow location permission

### Geo-Fencing

- Connect as parent
- Draw a safe zone on the map
- Add a zone name and label
- Save it
- Watch the dashboard update when the child enters or exits that zone

---

## Architecture

<img width="1480" height="560" alt="Image" src="https://github.com/user-attachments/assets/bfa0a9d0-7389-4c9a-b480-fa714e87a6fd" />

## Data Flow Diagrams

### Level 0
<img width="1671" height="523" alt="Image" src="https://github.com/user-attachments/assets/1d98682f-b6b2-4928-8285-69b192fc3599" />

### Level 1
<img width="1584" height="705" alt="Image" src="https://github.com/user-attachments/assets/af7c48d3-c4a7-4620-8041-81a08d0fd87b" />

### Level 2
<img width="1467" height="677" alt="Image" src="https://github.com/user-attachments/assets/c6f2f6ba-43bf-4f55-9e2c-a2a2f7057dca" />

---

## Core Code Highlights

These are the best functions to show in documentation or presentation:

- `initFirebase()` - backend initialization
- `connectAsParent()` - parent session setup
- `connectAsChild()` - child session setup
- `publishLocation(position)` - pushing location to Firestore
- `subscribeToFamily()` - realtime dashboard listener
- `initMap()` - map and drawing tool setup
- `findContainingZone(latlng)` - geo-fence logic
- `evaluateCurrentPosition()` - alert decision logic

If you want a deeper report-style explanation, see `docs/PROJECT_REPORT.md`

---

## Screenshots
<img width="1887" height="906" alt="Image" src="https://github.com/user-attachments/assets/129dd5e2-16cd-4f94-ba1b-b723602989cd" />

## 

<img width="1758" height="730" alt="Image" src="https://github.com/user-attachments/assets/5a708a18-2e17-4b3a-a6fa-b0c15ef09cf7" />

## 

<img width="1331" height="491" alt="Image" src="https://github.com/user-attachments/assets/88fb2d53-74aa-4a7f-bb42-25c33e1427ee" />

---

## Known Limitations

- The current version uses anonymous authentication for simplicity.
- AI anomaly detection is a planned enhancement, not fully implemented in the current version.
- The system depends on browser geolocation permission.
- Reliable testing requires internet access and an active Firebase project.

---

## Future Enhancements

- Multi-child support in one parent account
- Email/phone/OTP-based authentication
- AI-based unusual-route detection
- SOS emergency button
- Push notifications with Firebase Cloud Messaging
- Offline synchronization improvements
- Native Android/iOS version

---

## Connect & Support

<p align="center">
  <a href="https://github.com/ranjeet22/ProximityProtect">
    <img src="https://img.shields.io/badge/View%20Code-GitHub-black?style=for-the-badge&logo=github"/>
  </a>
  <a href="https://github.com/ranjeet22/ProximityProtect/issues">
    <img src="https://img.shields.io/badge/Report-Issue-red?style=for-the-badge&logo=github"/>
  </a>
  <a href="https://proximity-protect.netlify.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit-green?style=for-the-badge&logo=vercel"/>
  </a>
</p>

---

<p align="center">
  ⭐ If you found this project useful, consider giving it a star.
</p>

<p align="center">
  Made with ❤️ by <b>Ranjeet Singh</b>
</p>
