import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

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
let functionsUsCentral1: Functions | undefined;

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

/**
 * Cliente Firebase Functions en `us-central1` (misma región que las callables desplegadas).
 * Usar solo con `httpsCallable` — nunca fetch ni URL manual a cloudfunctions.net.
 *
 * @example const fn = httpsCallable(functions(), 'setImageKitPrivateKey');
 */
export function functions(): Functions {
  if (!functionsUsCentral1) {
    functionsUsCentral1 = getFunctions(getApp(), 'us-central1');
  }
  return functionsUsCentral1;
}

/** Alias del mismo cliente (compatibilidad). */
export function getFunctionsClient(): Functions {
  return functions();
}
