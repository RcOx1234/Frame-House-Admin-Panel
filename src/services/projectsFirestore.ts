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

export async function getProjects(): Promise<FirestoreProject[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({
    idDoc: d.id,
    ...(d.data() as Project),
  }));
}

export async function createProject(project: any): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...project,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProject(idDoc: string, project: any): Promise<void> {
  const ref = doc(db, COLLECTION, idDoc);
  await updateDoc(ref, {
    ...project,
    updatedAt: serverTimestamp(),
  });
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
      {
        ...project,
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    processed += 1;
    if (onProgress) onProgress(processed, total, project.id);
  }

  return { total, processed };
}

