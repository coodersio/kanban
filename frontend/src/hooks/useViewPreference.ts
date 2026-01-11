import { useState, useEffect } from 'react';

type ViewMode = 'kanban' | 'priority';

/**
 * Custom hook for managing workbench view mode preference
 * Persists user's view choice in localStorage
 */
export function useViewPreference() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Initialize from localStorage on mount
    const saved = localStorage.getItem('workbench-view-mode');
    return (saved as ViewMode) || 'kanban';
  });

  // Persist to localStorage whenever viewMode changes
  useEffect(() => {
    localStorage.setItem('workbench-view-mode', viewMode);
  }, [viewMode]);

  return { viewMode, setViewMode };
}
