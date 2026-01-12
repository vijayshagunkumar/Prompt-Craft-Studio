// ==================== JAVA BACKEND CONFIGURATION ====================

const JavaBackendConfig = {
    BASE_URL: 'http://localhost:8080',
    ENDPOINTS: {
        SCORE: '/api/v1/score',
        HEALTH: '/api/v1/health'
    },
    TIMEOUT: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
    CACHE_DURATION: 60000,
    FEATURES: {
        LOCAL_FALLBACK: true,
        ANALYTICS: true,
        DEBUG_MODE: false
    }
};

// Attach to AppConfig safely
if (typeof window.AppConfig === 'object') {
    window.AppConfig.JavaBackend = JavaBackendConfig;
}
