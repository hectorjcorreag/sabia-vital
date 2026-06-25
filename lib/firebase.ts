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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingFirebaseVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseVars.length > 0) {
  console.error(
    "Faltan variables de Firebase:",
    missingFirebaseVars.join(", ")
  );
}

export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

let _db: Firestore | null = null;

export const db: Firestore = (() => {
  if (_db) return _db;

  try {
    _db = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      DATABASE_ID
    );

    return _db;
  } catch {
    _db = getFirestore(app, DATABASE_ID);
    return _db;
  }
})();

// Auth secundario para crear usuarios sin cerrar sesión admin
const SECONDARY_APP_NAME = "secondaryAuthApp";

export function getSecondaryAuth(): Auth {
  const existing = getApps().find((firebaseApp) => firebaseApp.name === SECONDARY_APP_NAME);
  const secondaryApp = existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME);

  return getAuth(secondaryApp);
}

export const firebaseDbId = DATABASE_ID;
export { firebaseConfig };