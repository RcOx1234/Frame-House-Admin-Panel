import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { Project } from '../types/project';
import { PROJECTS_SEED } from '../data/projectsSeed';

export type FirestoreProject = Project & { idDoc: string };
const db = getDb();
const COLLECTION = 'projects';

/** Objetos planos solamente; no transforma Timestamp, FieldValue u otras instancias. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Elimina recursivamente propiedades `undefined` antes de escribir en Firestore. */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested === undefined) continue;
    out[key] = stripUndefinedDeep(nested);
  }
  return out as T;
}

export async function getProjects(): Promise<FirestoreProject[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({
    idDoc: d.id,
    ...(d.data() as Project),
  }));
}

export async function createProject(project: any): Promise<void> {
  await addDoc(
    collection(db, COLLECTION),
    stripUndefinedDeep({
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
}

export async function updateProject(idDoc: string, project: any): Promise<void> {
  const ref = doc(db, COLLECTION, idDoc);
  await updateDoc(
    ref,
    stripUndefinedDeep({
      ...project,
      updatedAt: serverTimestamp(),
    })
  );
}

export async function deleteProject(idDoc: string): Promise<void> {
  const ref = doc(db, COLLECTION, idDoc);
  await deleteDoc(ref);
}

// Migración idempotente: upsert por project.id como id de documento.
export async function seedProjectsToFirestore(
  onProgress?: (done: number, total: number, id: string) => void
): Promise<{ total: number; processed: number }> {
  const total = PROJECTS_SEED.length;
  let processed = 0;

  for (const project of PROJECTS_SEED) {
    const ref = doc(db, COLLECTION, project.id);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      stripUndefinedDeep({
        ...project,
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
    processed += 1;
    if (onProgress) onProgress(processed, total, project.id);
  }

  return { total, processed };
}

