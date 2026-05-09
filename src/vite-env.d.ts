/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Región de Cloud Functions (p. ej. us-central1). Opcional si coincide con la predeterminada del SDK. */
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
