// ==================== JAVA BACKEND CONFIGURATION ====================
// This file is CONFIG ONLY.
// No scoring logic. No debug simulation.

const JavaBackendConfig = {
    // Cloudflare Worker is the ONLY allowed entry point
    WORKER_BASE_URL: 'https://promptcraft-api.vijay-shagunkumar.workers.dev',

    ENDPOINTS: {
        SCORE: '/score'
    },

    TIMEOUT: 8000,

    FEATURES: {
        ENABLE_SCORING: true
    }
};

// Attach to AppConfig safely
if (typeof window.AppConfig === 'object') {
    window.AppConfig.JavaBackend = JavaBackendConfig;
}
