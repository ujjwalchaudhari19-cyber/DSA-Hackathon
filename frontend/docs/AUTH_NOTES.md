# Firebase Authentication Session Flow Architecture

## 1. Overview
GramUdyam AI uses the **Firebase Authentication (Modular SDK v10+)** for authentication, multi-platform identity, and zero-friction guest sessions.

Environment variables required:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

---

## 2. Session Lifecycle & `onAuthStateChanged`
Session state is managed reactively through Firebase's `onAuthStateChanged(auth, callback)`:
1. **Application Start**: `useAuthStore.initialize()` registers `onAuthStateChanged`.
2. **Returning User / Guest**: If a valid session is cached in IndexedDB/localStorage, Firebase emits the current `User` object.
3. **First-Time Visitor**: If no user session is detected, `signInAnonymously(auth)` is automatically triggered. This grants an immediate anonymous credential with zero UX friction.
4. **Token Refreshing**:
   - The Axios request interceptor calls `currentUser.getIdToken()`. The Firebase SDK automatically refreshes the JWT if it has expired.
   - If an API request responds with `401 Unauthorized`, the interceptor calls `currentUser.getIdToken(true)` (force-refresh) and retries the request once.
   - If the refresh fails or the user account is disabled, the user is signed out and redirected to `/login`.

---

## 3. Upgrading a Guest Account (Account Linking)

To ensure that guest work (discovered ideas, answers, draft feasibility reports) is never lost, we use **Firebase Account Linking**:

```
                  ┌──────────────────────────────┐
                  │ Guest User (Anonymous UID)   │
                  └──────────────┬───────────────┘
                                 │
                   User Signs Up / Upgrades
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
      [linkWithCredential]                  [linkWithPopup]
      (Email / Password)                       (Google)
              │                                     │
    ┌─────────┴─────────┐                 ┌─────────┴─────────┐
    │                   │                 │                   │
 Success             Error             Success             Error
    │                   │                 │                   │
    ▼                   ▼                 ▼                   ▼
Same UID        auth/credential-        Same UID        auth/credential-
Preserved!      already-in-use          Preserved!      already-in-use
                        │                                     │
                        ▼                                     ▼
                1. Save Guest Token                   1. Save Guest Token
                2. signInWithEmail...                 2. signInWithPopup
                3. POST /me/claim-guest-data          3. POST /me/claim-guest-data
```

### Fallback Claim Logic
When linking throws `auth/credential-already-in-use` (e.g. the user already created an account on another device with that email):
1. The client captures the active guest token before signing in.
2. The user signs into their existing account.
3. The client calls `POST /me/claim-guest-data` with `guest_token`.
4. If the server request fails, the local guest token is retained and a retry option is presented to the user.

---

## 4. Privacy and Shared Device Partitioning
1. **Per-User State Partitioning**: `useAppStore` tracks `activeUserId`. When a different user signs in on the same device, previous enterprise slices (`profile`, `idea`, `report`, `compareList`) are wiped immediately.
2. **Logout & Deletion**: Logging out or executing "Delete My Data" clears:
   - Zustand persisted store (`gramudyam-storage`)
   - Auth storage (`gramudyam-auth`)
   - React Query in-memory cache
   - Offline cached report (`gramudyam-last-report`)
   - Any local storage credentials.

