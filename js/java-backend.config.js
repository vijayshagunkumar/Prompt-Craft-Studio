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

// ======================
// JAVA BACKEND HEALTH CHECK
// ======================
async function checkJavaBackendHealth() {
    try {
        console.log('🔍 Checking Java backend health...');
        
        // If debug mode is enabled, simulate success
        if (JavaBackendConfig.FEATURES.DEBUG_MODE) {
            console.log('🟡 Debug mode: Simulating healthy backend');
            return {
                status: 'healthy',
                message: 'Debug mode - backend simulation',
                timestamp: new Date().toISOString()
            };
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 3000)
        );
        
        const healthUrl = `${JavaBackendConfig.BASE_URL}${JavaBackendConfig.ENDPOINTS.HEALTH}`;
        
        // Try to fetch health endpoint
        const healthPromise = fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([healthPromise, timeoutPromise]);
        
        if (response && response.ok) {
            const healthData = await response.json();
            console.log('✅ Java backend is healthy:', healthData);
            return { 
                status: 'healthy', 
                message: 'Java backend is available',
                data: healthData,
                timestamp: new Date().toISOString()
            };
        } else {
            console.warn('⚠️ Java backend health check failed:', response?.status);
            return { 
                status: 'unavailable', 
                message: 'Java backend is not responding correctly',
                timestamp: new Date().toISOString()
            };
        }
        
    } catch (error) {
        console.warn('⚠️ Java backend health check error:', error.message);
        return { 
            status: 'unavailable', 
            message: `Java backend is offline: ${error.message}`,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ======================
// PROMPT SCORING FUNCTION
// ======================
async function scorePrompt(promptText) {
    try {
        console.log('📊 Sending prompt to Java backend for scoring...');
        
        if (!promptText || promptText.trim().length < 10) {
            throw new Error('Prompt text is too short for scoring');
        }
        
        // If debug mode is enabled, simulate a response
        if (JavaBackendConfig.FEATURES.DEBUG_MODE) {
            console.log('🟡 Debug mode: Simulating scoring response');
            return {
                score: 7.5,
                dimensions: {
                    clarity: 75,
                    structure: 70,
                    intent: 80
                },
                feedback: 'Debug mode - simulated scoring',
                isFallback: false,
                timestamp: new Date().toISOString()
            };
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Scoring timeout')), JavaBackendConfig.TIMEOUT)
        );
        
        const scoreUrl = `${JavaBackendConfig.BASE_URL}${JavaBackendConfig.ENDPOINTS.SCORE}`;
        
        // Prepare the request
        const scoringPromise = fetch(scoreUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                prompt: promptText,
                timestamp: new Date().toISOString(),
                language: 'en',
                metadata: {
                    source: 'promptcraft-pro',
                    version: '2.0.0'
                }
            })
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([scoringPromise, timeoutPromise]);
        
        if (response && response.ok) {
            const scoreData = await response.json();
            console.log('✅ Prompt scored successfully:', scoreData);
            
            // Ensure the response has the expected format
            return {
                score: scoreData.score || 0,
                dimensions: scoreData.dimensions || {
                    clarity: 0,
                    structure: 0,
                    intent: 0
                },
                feedback: scoreData.feedback || 'Scoring complete',
                isFallback: false,
                timestamp: new Date().toISOString(),
                backendData: scoreData
            };
        } else {
            throw new Error(`Backend responded with status: ${response?.status}`);
        }
        
    } catch (error) {
        console.error('❌ Java backend scoring failed:', error.message);
        
        // If local fallback is enabled, throw error to trigger local scoring
        if (JavaBackendConfig.FEATURES.LOCAL_FALLBACK) {
            throw error; // This will be caught by scoreCurrentPrompt() and trigger local fallback
        } else {
            // Return a basic error response
            return {
                score: 0,
                dimensions: {
                    clarity: 0,
                    structure: 0,
                    intent: 0
                },
                feedback: `Scoring failed: ${error.message}`,
                isFallback: false,
                error: true,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// ======================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ======================
if (typeof window !== 'undefined') {
    window.checkJavaBackendHealth = checkJavaBackendHealth;
    window.scorePrompt = scorePrompt;
    console.log('✅ Java backend functions exposed to window');
}
