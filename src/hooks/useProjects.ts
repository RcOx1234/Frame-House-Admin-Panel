import { useCallback, useEffect, useState } from 'react';
import { getProjects } from '../services/projectsFirestore';

export function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { projects, reload: load, loading };
}

