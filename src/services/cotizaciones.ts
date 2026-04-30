import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  type Timestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type { CotizacionDoc } from '../types/cotizacion';
import { dateFromFirestore } from '../utils/formatters';

function createdMs(row: CotizacionDoc): number {
  const d = dateFromFirestore(row.creadoEn);
  return d ? d.getTime() : 0;
}

function mapDoc(id: string, data: Record<string, unknown>): CotizacionDoc {
  const cliente = (data.cliente ?? {}) as CotizacionDoc['cliente'];
  const plan = (data.plan ?? {}) as CotizacionDoc['plan'];
  const totales = (data.totales ?? {}) as CotizacionDoc['totales'];
  const productosAdicionales = Array.isArray(data.productosAdicionales)
    ? (data.productosAdicionales as CotizacionDoc['productosAdicionales'])
    : [];

  return {
    id,
    tipo: typeof data.tipo === 'string' ? data.tipo : undefined,
    cliente: {
      nombre: typeof cliente.nombre === 'string' ? cliente.nombre : '',
      email: typeof cliente.email === 'string' ? cliente.email : '',
      empresa: typeof cliente.empresa === 'string' ? cliente.empresa : '',
    },
    plan: {
      valor: typeof plan.valor === 'string' ? plan.valor : '',
      nombre: typeof plan.nombre === 'string' ? plan.nombre : '',
      precioUsd: typeof plan.precioUsd === 'number' ? plan.precioUsd : Number(plan.precioUsd) || 0,
      etiquetaLista:
        typeof plan.etiquetaLista === 'string' ? plan.etiquetaLista : '',
    },
    productosAdicionales,
    totales: {
      subtotalPlanUsd:
        typeof totales.subtotalPlanUsd === 'number'
          ? totales.subtotalPlanUsd
          : Number(totales.subtotalPlanUsd) || 0,
      subtotalAdicionalesUsd:
        typeof totales.subtotalAdicionalesUsd === 'number'
          ? totales.subtotalAdicionalesUsd
          : Number(totales.subtotalAdicionalesUsd) || 0,
      totalEstimadoUsd:
        typeof totales.totalEstimadoUsd === 'number'
          ? totales.totalEstimadoUsd
          : Number(totales.totalEstimadoUsd) || 0,
    },
    creadoEn: (data.creadoEn as Timestamp | Date | null | undefined) ?? null,
  };
}

export async function fetchCotizaciones(): Promise<CotizacionDoc[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'cotizaciones'));
  const rows: CotizacionDoc[] = [];
  snap.forEach((d) => {
    rows.push(mapDoc(d.id, d.data() as Record<string, unknown>));
  });
  rows.sort((a, b) => createdMs(b) - createdMs(a));
  return rows;
}

export async function deleteCotizacion(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'cotizaciones', id));
}
