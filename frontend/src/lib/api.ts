/**
 * API fetch wrapper that automatically includes credentials
 * This ensures cookies are sent with every request for session management
 */

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
        ...options,
        credentials: 'include', // Always include credentials for session cookies
    });
}

// Export a default object with common HTTP methods
export const api = {
    get: (url: string, options?: RequestInit) =>
        apiFetch(url, { ...options, method: 'GET' }),

    post: (url: string, body?: any, options?: RequestInit) =>
        apiFetch(url, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: (url: string, body?: any, options?: RequestInit) =>
        apiFetch(url, {
            ...options,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: (url: string, options?: RequestInit) =>
        apiFetch(url, { ...options, method: 'DELETE' }),
};
