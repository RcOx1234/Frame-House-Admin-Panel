import { useCallback, useEffect, useState } from 'react';
import { getProjects } from '../services/projectsFirestore';

export function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { projects, reload: load, loading, error };
}

