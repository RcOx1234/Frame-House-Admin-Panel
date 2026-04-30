import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
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

export function getDb(): Firestore {
  const cfg = firebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error(
      'Falta configuración de Firebase. Crea .env.local con las variables VITE_FIREBASE_* indicadas en .env.example.'
    );
  }
  if (!db) {
    app = getApps().length ? getApps()[0] : initializeApp(cfg);
    db = getFirestore(app);
  }
  return db;
}

export function panelPasswords() {
  return {
    admin: import.meta.env.VITE_ADMIN_PASSWORD ?? '',
    guest: import.meta.env.VITE_GUEST_PASSWORD ?? '',
  };
}
