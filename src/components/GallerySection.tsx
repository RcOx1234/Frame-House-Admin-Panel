import { useEffect, useMemo, useState } from 'react';
import type { FilterType, GalleryViewMode, Project } from '../types/project';
import {
  createProject as createProjectFs,
  deleteProject as deleteProjectFs,
  updateProject as updateProjectFs,
} from '../services/projectsFirestore';
import { useProjects } from '../hooks/useProjects';
import { ProjectDetailsModal } from './ProjectDetailsModal';
import { ProjectFormModal } from './ProjectFormModal';

const FILTERS: FilterType[] = [
  'Todos',
  'Videos',
  'Webs',
  'Contenido Social',
  'Branding / Diseño',
  'Fotografía',
  'Otros',
];

type Props = {
  role: 'admin' | 'guest';
  createSignal?: number;
  reloadSignal?: number;
  viewMode: GalleryViewMode;
};

export function GallerySection({ role, createSignal = 0, reloadSignal = 0, viewMode }: Props) {
  const { projects, reload, loading } = useProjects();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('Todos');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [details, setDetails] = useState<Project | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const rows = projects as Project[];

  useEffect(() => {
    if (!createSignal) return;
    if (role !== 'admin') return;
    openCreate();
  }, [createSignal, role]);

  useEffect(() => {
    if (!reloadSignal) return;
    void reload();
  }, [reload, reloadSignal]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (filter !== 'Todos') list = list.filter((p) => p.category === filter);
    if (featuredOnly) list = list.filter((p) => Boolean(p.featured));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [featuredOnly, filter, query, rows]);

  function openCreate() {
    setFormMode('create');
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setFormMode('edit');
    setEditing(project);
    setFormOpen(true);
  }

  async function onSubmit(project: Project) {
    if (formMode === 'create') {
      const payload = { ...project };
      delete payload.idDoc;
      await createProjectFs(payload);
    } else {
      const idDoc = editing?.idDoc;
      if (!idDoc) return;
      const payload = { ...project };
      delete payload.idDoc;
      await updateProjectFs(idDoc, payload);
    }
    await reload();
    setFormOpen(false);
  }

  async function onDelete(project: Project) {
    const ok = window.confirm('¿Eliminar este proyecto?');
    if (!ok) return;
    if (!project.idDoc) return;
    await deleteProjectFs(project.idDoc);
    await reload();
  }

  function onCopyId(id: string) {
    void navigator.clipboard.writeText(id);
    setFeedback('ID copiado');
    window.setTimeout(() => setFeedback(null), 1800);
  }

  async function onToggleFeatured(project: Project) {
    if (role !== 'admin') return;
    if (!project.idDoc) return;
    await updateProjectFs(project.idDoc, { featured: !project.featured });
    await reload();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-xs uppercase text-neutral-500">Buscar</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titulo, cliente o ID..."
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100"
            />
          </div>
          <div className="w-full lg:w-52">
            <label className="text-xs uppercase text-neutral-500">Filtro</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100"
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {role === 'admin' ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-neutral-950"
              >
                Nuevo proyecto
              </button>
            ) : null}
          </div>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} />
          Solo destacados
        </label>
        {feedback ? <p className="mt-3 text-sm text-amber-400">{feedback}</p> : null}
      </div>

      {loading ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-10 text-center text-sm text-neutral-400">
          Cargando proyectos...
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-3 max-sm:gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 max-sm:p-2">
              <img
                src={p.thumbnail}
                alt={p.title}
                className="h-40 max-sm:h-32 w-full rounded-lg object-cover"
                loading="lazy"
              />
              <div className="mt-3 max-sm:mt-2">
                <p className="text-xs text-neutral-500">{p.type}</p>
                <h3 className="mt-1 truncate text-sm font-semibold text-neutral-100 max-sm:text-[13px]">{p.title}</h3>
                <p className="mt-1 truncate text-xs text-neutral-400">{p.client}</p>
                <p className="mt-1 text-xs text-neutral-500">{p.format}</p>
              </div>
              <div className="mt-3 max-sm:mt-2 flex flex-wrap gap-2 max-sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetails(p)}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200"
                >
                  Ver detalles
                </button>
                {role === 'admin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(p)}
                      className="rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs text-red-300"
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => void onToggleFeatured(p)}
                      className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-200"
                    >
                      {p.featured ? 'Quitar destacado' : 'Destacar'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/80 text-xs uppercase text-neutral-500">
                  <th className="px-4 py-3">Thumb</th>
                  <th className="px-4 py-3">Titulo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Formato</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-800/30">
                    <td className="px-4 py-3">
                      <img src={p.thumbnail} alt={p.title} className="h-10 w-16 rounded object-cover" />
                    </td>
                    <td className="px-4 py-3 text-neutral-100">{p.title}</td>
                    <td className="px-4 py-3 text-neutral-300">{p.client}</td>
                    <td className="px-4 py-3 text-neutral-400">{p.type}</td>
                    <td className="px-4 py-3 text-neutral-400">{p.format}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDetails(p)}
                          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200"
                        >
                          Ver
                        </button>
                        {role === 'admin' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDelete(p)}
                              className="rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs text-red-300"
                            >
                              Eliminar
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 px-4 py-10 text-center text-sm text-neutral-500">
          No hay proyectos con los filtros actuales.
        </div>
      ) : null}

      <ProjectDetailsModal open={Boolean(details)} project={details} onClose={() => setDetails(null)} onCopyId={onCopyId} />
      <ProjectFormModal
        open={formOpen}
        mode={formMode}
        projects={rows}
        initialProject={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={onSubmit}
      />
    </section>
  );
}

