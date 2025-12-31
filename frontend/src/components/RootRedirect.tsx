import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Smart root path redirect component
 * Checks if user is logged in and redirects accordingly:
 * - If logged in: redirect to /dashboard
 * - If not logged in: redirect to /login
 */
export default function RootRedirect() {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(!!data.user);
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-background">
                <div className="text-muted-foreground">加载中...</div>
            </div>
        );
    }

    return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}
