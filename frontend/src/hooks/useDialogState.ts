import { useState } from 'react';

/**
 * Custom hook to manage all dialog open/close states in Workbench
 */
export function useDialogState() {
    // Dialog Open States
    const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

    // Drawer States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isStoryDrawerOpen, setIsStoryDrawerOpen] = useState(false);

    // Tab States (for dialogs with tabs)
    const [activeStoryTab, setActiveStoryTab] = useState<'create' | 'reuse'>('create');
    const [activeTaskTab, setActiveTaskTab] = useState<'create' | 'reuse'>('create');
    const [activeProjectTab, setActiveProjectTab] = useState<'create' | 'reuse'>('create');

    // Helper functions to open/close dialogs
    const openStoryDialog = () => {
        setActiveStoryTab('create');
        setIsStoryDialogOpen(true);
    };

    const closeStoryDialog = () => {
        setIsStoryDialogOpen(false);
    };

    const openTaskDialog = () => {
        setActiveTaskTab('create');
        setIsTaskDialogOpen(true);
    };

    const closeTaskDialog = () => {
        setIsTaskDialogOpen(false);
    };

    const openProjectDialog = () => {
        setActiveProjectTab('create');
        setIsProjectDialogOpen(true);
    };

    const closeProjectDialog = () => {
        setIsProjectDialogOpen(false);
    };

    const closeAllDrawers = () => {
        setIsDrawerOpen(false);
        setIsStoryDrawerOpen(false);
    };

    return {
        // Story Dialog
        isStoryDialogOpen,
        setIsStoryDialogOpen,
        openStoryDialog,
        closeStoryDialog,
        activeStoryTab,
        setActiveStoryTab,

        // Task Dialog
        isTaskDialogOpen,
        setIsTaskDialogOpen,
        openTaskDialog,
        closeTaskDialog,
        activeTaskTab,
        setActiveTaskTab,

        // Project Dialog
        isProjectDialogOpen,
        setIsProjectDialogOpen,
        openProjectDialog,
        closeProjectDialog,
        activeProjectTab,
        setActiveProjectTab,

        // Drawers
        isDrawerOpen,
        setIsDrawerOpen,
        isStoryDrawerOpen,
        setIsStoryDrawerOpen,
        closeAllDrawers
    };
}
