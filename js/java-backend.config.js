// ==================== JAVA BACKEND CONFIGURATION ====================

const JavaBackendConfig = {
    // Use a public test endpoint for now - replace with your actual backend URL
    BASE_URL: 'https://jsonplaceholder.typicode.com', // Test API that always works
    // For local development: 'http://localhost:8080'
    // For production: 'https://your-java-backend.com'
    
    ENDPOINTS: {
        // Using test endpoints that always return data
        SCORE: '/posts/1', // This will return JSON data for testing
        HEALTH: '/posts/1' // Same for health check
    },
    TIMEOUT: 5000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
    CACHE_DURATION: 60000,
    FEATURES: {
        LOCAL_FALLBACK: true,
        ANALYTICS: true,
        DEBUG_MODE: true // Enable debug mode to see what's happening
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
                timestamp: new Date().toISOString(),
                score: 7.5,
                dimensions: {
                    clarity: 75,
                    structure: 80,
                    intent: 70
                }
            };
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), JavaBackendConfig.TIMEOUT)
        );
        
        const healthUrl = `${JavaBackendConfig.BASE_URL}${JavaBackendConfig.ENDPOINTS.HEALTH}`;
        console.log('Health check URL:', healthUrl);
        
        // Try to fetch health endpoint
        const healthPromise = fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors' // Important for cross-origin requests
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([healthPromise, timeoutPromise]);
        
        console.log('Health check response:', response);
        
        if (response && response.ok) {
            const healthData = await response.json();
            console.log('✅ Backend is healthy:', healthData);
            return { 
                status: 'healthy', 
                message: 'Backend is available',
                data: healthData,
                timestamp: new Date().toISOString()
            };
        } else {
            console.warn('⚠️ Backend health check failed:', response?.status);
            return { 
                status: 'unavailable', 
                message: `Backend responded with status: ${response?.status}`,
                timestamp: new Date().toISOString()
            };
        }
        
    } catch (error) {
        console.warn('⚠️ Backend health check error:', error.message);
        return { 
            status: 'unavailable', 
            message: `Backend is offline: ${error.message}`,
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
        console.log('📊 Sending prompt to backend for scoring...');
        console.log('Prompt length:', promptText?.length);
        console.log('Prompt preview:', promptText?.substring(0, 100));
        
        if (!promptText || promptText.trim().length < 10) {
            throw new Error('Prompt text is too short for scoring');
        }
        
        // If debug mode is enabled, simulate a response with realistic scores
        if (JavaBackendConfig.FEATURES.DEBUG_MODE) {
            console.log('🟡 Debug mode: Simulating scoring response');
            
            // Generate realistic scores based on prompt content
            const length = promptText.length;
            let baseScore = 6.0;
            
            // Score based on length
            if (length > 500) baseScore += 2.0;
            else if (length > 300) baseScore += 1.5;
            else if (length > 150) baseScore += 1.0;
            else if (length < 50) baseScore -= 1.0;
            
            // Score based on structure
            const hasSections = /(?:^|\n)(?:#{1,6}|-|\d+\.|\*)\s+.+/i.test(promptText);
            if (hasSections) baseScore += 1.0;
            
            // Score based on clarity indicators
            const clarityIndicators = [
                /role\s*:/i,
                /objective\s*:/i,
                /task\s*:/i,
                /instructions\s*:/i,
                /format\s*:/i,
                /constraints\s*:/i
            ];
            
            const foundIndicators = clarityIndicators.filter(pattern => pattern.test(promptText)).length;
            baseScore += Math.min(foundIndicators * 0.5, 2.0);
            
            // Ensure score is between 0-10
            const finalScore = Math.min(10, Math.max(0, baseScore));
            
            // Generate dimensions based on score
            const clarity = Math.round((finalScore / 10) * 100);
            const structure = Math.round(clarity * 0.9);
            const intent = Math.round(clarity * 0.95);
            
            return {
                score: parseFloat(finalScore.toFixed(1)),
                dimensions: {
                    clarity: clarity,
                    structure: structure,
                    intent: intent
                },
                feedback: getFeedbackBasedOnScore(finalScore),
                isFallback: false,
                timestamp: new Date().toISOString(),
                debug: true
            };
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Scoring timeout')), JavaBackendConfig.TIMEOUT)
        );
        
        const scoreUrl = `${JavaBackendConfig.BASE_URL}${JavaBackendConfig.ENDPOINTS.SCORE}`;
        console.log('Score URL:', scoreUrl);
        
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
                    version: '2.0.0',
                    length: promptText.length
                }
            })
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([scoringPromise, timeoutPromise]);
        
        console.log('Scoring response:', response);
        
        if (response && response.ok) {
            const scoreData = await response.json();
            console.log('✅ Prompt scored successfully:', scoreData);
            
            // Extract score from response (adjust based on your backend response format)
            let score = 0;
            let dimensions = { clarity: 0, structure: 0, intent: 0 };
            let feedback = 'Scoring complete';
            
            // Try to extract score from different possible response formats
            if (scoreData.score !== undefined) {
                score = scoreData.score;
            } else if (scoreData.rating !== undefined) {
                score = scoreData.rating;
            } else if (scoreData.id !== undefined) {
                // For test API that returns {id: 1, ...}
                score = 7.5; // Default test score
            }
            
            if (scoreData.dimensions) {
                dimensions = scoreData.dimensions;
            } else if (scoreData.metrics) {
                dimensions = scoreData.metrics;
            }
            
            if (scoreData.feedback) {
                feedback = scoreData.feedback;
            } else if (scoreData.message) {
                feedback = scoreData.message;
            }
            
            return {
                score: score,
                dimensions: dimensions,
                feedback: feedback,
                isFallback: false,
                timestamp: new Date().toISOString(),
                backendData: scoreData
            };
        } else {
            throw new Error(`Backend responded with status: ${response?.status}`);
        }
        
    } catch (error) {
        console.error('❌ Backend scoring failed:', error.message);
        
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

// Helper function for debug mode feedback
function getFeedbackBasedOnScore(score) {
    if (score >= 9.0) {
        return 'Excellent prompt! Well-structured, clear, and likely to produce great results.';
    } else if (score >= 7.0) {
        return 'Good prompt. Consider adding more specific instructions or examples.';
    } else if (score >= 5.0) {
        return 'Average prompt. Try adding role definitions, clearer objectives, or formatting.';
    } else {
        return 'Needs improvement. Consider using templates or adding more detail.';
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
