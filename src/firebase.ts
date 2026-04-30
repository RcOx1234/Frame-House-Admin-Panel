import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

function getApp(): FirebaseApp {
  const cfg = firebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error(
      'Falta configuración de Firebase. Crea .env.local con las variables VITE_FIREBASE_* indicadas en .env.example.'
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(cfg);
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getApp());
  }
  return db;
}

export function getAuthClient(): Auth {
  if (!auth) {
    auth = getAuth(getApp());
  }
  return auth;
}
