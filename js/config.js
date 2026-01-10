// Configuration for PromptCraft Pro
const AppConfig = {
    // Cloudflare Worker Configuration
    WORKER_CONFIG: {
        // Your worker URL
        workerUrl: 'https://promptcraft-api.vijay-shagunkumar.workers.dev/',
        
        // Worker endpoints
        endpoints: {
            generate: '/',
            health: '/health'
        },
        
        // Default model settings (matching your worker)
        defaultModel: 'gemini-3-flash-preview',
        fallbackModels: [
            'gpt-4o-mini',
            'llama-3.1-8b-instant'
        ],
        
        // Request settings
        timeout: 30000,
        retryAttempts: 2,
        fallbackToLocal: true,
        enableApiKey: false // Your worker has API keys disabled
    },
    
    // Available models from your worker
    AVAILABLE_MODELS: [
        {
            id: 'gemini-3-flash-preview',
            name: 'Gemini 3 Flash',
            provider: 'Google',
            description: 'Latest Gemini model with fast response times',
            recommended: true,
            icon: 'fab fa-google',
            color: '#8B5CF6'
        },
        {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'OpenAI',
            description: 'Cost-effective OpenAI model',
            recommended: false,
            icon: 'fas fa-comment-alt',
            color: '#10A37F'
        },
        {
            id: 'llama-3.1-8b-instant',
            name: 'Llama 3.1 8B',
            provider: 'Groq',
            description: 'Fast Llama model via Groq',
            recommended: false,
            icon: 'fas fa-robot',
            color: '#3B82F6'
        }
    ],
    
    // Prompt styles
    PROMPT_STYLES: [
        { id: 'detailed', name: 'Detailed & Structured', icon: 'fas fa-file-alt' },
        { id: 'concise', name: 'Concise & Direct', icon: 'fas fa-bolt' },
        { id: 'creative', name: 'Creative & Engaging', icon: 'fas fa-paint-brush' },
        { id: 'analytical', name: 'Analytical & Technical', icon: 'fas fa-chart-line' },
        { id: 'professional', name: 'Professional & Formal', icon: 'fas fa-briefcase' }
    ],
    
    // Default settings
    DEFAULT_SETTINGS: {
        theme: 'dark',
        uiDensity: 'comfortable',
        defaultModel: 'gemini-3-flash-preview',
        promptStyle: 'detailed',
        autoConvertDelay: 0,
        voiceInputLanguage: 'en-US',
        voiceOutputLanguage: 'en-US',
        interfaceLanguage: 'en',
        maxHistoryItems: 25,
        notificationDuration: 3000
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        SETTINGS: 'promptCraftSettings',
        HISTORY: 'promptCraftHistory',
        TEMPLATES: 'promptCraftTemplates'
    },
    
    // Rate limiting
    RATE_LIMIT: {
        requestsPerMinute: 20,
        requestsPerDay: 500
    },
    
    // UI Configuration
    UI: {
        MAX_INPUT_LENGTH: 5000,
        MAX_PROMPT_LENGTH: 10000,
        DEBOUNCE_DELAY: 500,
        ANIMATION_DURATION: 300
    }
};

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}
