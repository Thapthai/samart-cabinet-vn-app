import axios from 'axios';

// Create axios instance for staff API
const staffApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/smart-cabinet-cu/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});


// Request interceptor to add client_id and client_secret for staff endpoints
staffApi.interceptors.request.use((config) => { 
    // Attach staff_token
    const staffToken = localStorage.getItem('staff_token');
    if (staffToken) {
        config.headers.Authorization = `Bearer ${staffToken}`;
    }

    // Attach client_id, client_secret from staff_user (preferred) or fallback
    let clientId = '';
    let clientSecret = '';
    try {
        const staffUser = localStorage.getItem('staff_user');
        if (staffUser) {
            const parsed = JSON.parse(staffUser) as { client_id?: string; clientId?: string; client_secret?: string; clientSecret?: string };
            clientId = parsed.client_id || parsed.clientId || '';
            clientSecret = parsed.client_secret || parsed.clientSecret || '';
        }
    } catch {}
    // fallback (legacy)
    if (!clientId) clientId = localStorage.getItem('staff_client_id') || '';
    if (!clientSecret) clientSecret = localStorage.getItem('staff_client_secret') || '';

    if (clientId) config.headers['client_id'] = clientId;
    if (clientSecret) config.headers['client_secret'] = clientSecret;

    return config;
});

// Response interceptor to handle errors
staffApi.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export default staffApi;
