// lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";

const DATABASE_ID = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "(default)";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// 🔥 Firestore “blindado”: fuerza long polling (evita "client is offline" por red/proxy)
let _db: Firestore | null = null;

export const db: Firestore = (() => {
  if (_db) return _db;

  try {
    // initializeFirestore solo se debe llamar una vez por app.
    // Si falla por algún motivo, hacemos fallback a getFirestore.
    _db = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
      },
      // databaseId para multi-db (cuando aplica)
      DATABASE_ID as any
    );
    return _db;
  } catch (e) {
    // Fallback
    _db = getFirestore(app, DATABASE_ID);
    return _db;
  }
})();

// Auth secundario (para crear usuarios sin tumbar sesión admin)
import { getAuth as getAuth2, type Auth as Auth2 } from "firebase/auth";
import { initializeApp as initializeApp2, getApps as getApps2 } from "firebase/app";

const SECONDARY_APP_NAME = "secondaryAuthApp";
export function getSecondaryAuth(): Auth2 {
  const existing = getApps2().find((a) => a.name === SECONDARY_APP_NAME);
  const app2 = existing ?? initializeApp2(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth2(app2);
}

export const firebaseDbId = DATABASE_ID;
export { firebaseConfig };