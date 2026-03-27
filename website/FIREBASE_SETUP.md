# Firebase Setup

1. Create a Firebase project and add a Web app.
2. Copy the Web app config into `firebase-config.js`.
3. In Firebase Authentication, enable `Anonymous` sign-in.
4. In Cloud Firestore, create a database in production or test mode.
5. Use these Firestore rules as a starting point:

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

6. Open `tracking.html` on the parent device and the child device.
7. Enter the same family code on both devices.
8. On the parent device, click `Connect as Parent`.
9. On the child device, click `Share This Device as Child` and allow location access.

Notes:

- This setup gives you a real backend-connected prototype with cross-network tracking.
- For production, replace anonymous auth with stronger user authentication and tighten the Firestore rules.
- The parent dashboard controls geofences; those geofences sync through Firestore for the active family code.
