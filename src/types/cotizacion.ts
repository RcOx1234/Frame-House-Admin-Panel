import type { Timestamp } from 'firebase/firestore';

export type PanelRole = 'admin' | 'guest';

export interface CotizacionDoc {
  id: string;
  tipo?: string;
  cliente: {
    nombre: string;
    email: string;
    empresa: string;
  };
  plan: {
    valor: string;
    nombre: string;
    precioUsd: number;
    etiquetaLista: string;
  };
  productosAdicionales: Array<{
    id: string;
    nombre: string;
    precioUsd: number;
  }>;
  totales: {
    subtotalPlanUsd: number;
    subtotalAdicionalesUsd: number;
    totalEstimadoUsd: number;
  };
  creadoEn: Timestamp | Date | null;
}

export type SortOrder = 'desc' | 'asc';

export type PlanFilterValue = 'todos' | 'impulso' | 'crecimiento' | 'dominio';
