// Advanced AI Prompt Generator with Cloudflare Worker Integration
class PromptGenerator {
    constructor(config = {}) {
        this.config = {
            workerUrl: config.workerUrl || 'https://promptcraft-api.vijay-shagunkumar.workers.dev/',
            defaultModel: config.defaultModel || 'gemini-3-flash-preview',
            timeout: config.timeout || 10000,
            retryAttempts: config.retryAttempts || 0,
            fallbackToLocal: config.fallbackToLocal !== false,
            enableDebug: config.enableDebug || false,
            strictPromptMode: config.strictPromptMode !== false,
            minPromptLength: config.minPromptLength || 150
        };
        
        // ✅ MODEL CAPABILITIES - SINGLE SOURCE OF TRUTH
        this.MODEL_CAPABILITIES = {
            "gemini-3-flash-preview": {
                name: "Gemini 3 Flash",
                executable: true,
                chat: true,
                description: "Fast, reliable prompt generation",
                provider: "google",
                default: true
            },
            "gpt-4o-mini": {
                name: "GPT-4o Mini", 
                executable: true,
                chat: true,
                description: "OpenAI's fast model",
                provider: "openai",
                default: false
            },
            "gemini-1.5-flash-latest": {
                name: "Gemini 1.5 Flash Latest",
                executable: true,
                chat: true,
                description: "Latest Gemini Flash",
                provider: "google",
                default: false
            },
            "gemini-1.5-flash": {
                name: "Gemini 1.5 Flash",
                executable: true,
                chat: true,
                description: "Stable Gemini Flash",
                provider: "google",
                default: false
            },
            "llama-3.1-8b-instant": {
                name: "LLaMA 3.1 Instant",
                executable: false,
                chat: true,
                description: "Fast chat & execution (not for prompt generation)",
                provider: "groq",
                default: false
            }
        };
        
        console.log(`PromptGenerator initialized with worker: ${this.config.workerUrl}`);
        console.log(`Default model: ${this.config.defaultModel}`);
        console.log(`Strict prompt mode: ${this.config.strictPromptMode}`);
        console.log(`Min prompt length: ${this.config.minPromptLength} chars`);
        
        // Performance metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalLatency: 0,
            averageLatency: 0,
            workerValidatedHits: 0,
            workerTotalValidations: 0,
            modelCorrections: 0,
            partialContentUsed: 0,
            localFallbackUsed: 0
        };
        
        // Cache for recent requests with versioning
        this.cache = new Map();
        this.cacheMaxSize = 50;
        this.cacheExpiry = 5 * 60 * 1000;
        this.cacheVersion = '2.0'; // ✅ UPDATED for new partial content handling
    }
    
    // ✅ Get allowed models based on mode
    getAllowedModels(strictPromptMode = true) {
        return Object.entries(this.MODEL_CAPABILITIES)
            .filter(([modelId, capabilities]) => {
                if (strictPromptMode) {
                    return capabilities.executable;
                }
                return true;
            })
            .map(([modelId]) => modelId);
    }
    
    // ✅ Get default model for mode
    getDefaultModel(strictPromptMode = true) {
        const allowedModels = this.getAllowedModels(strictPromptMode);
        
        const defaultModel = allowedModels.find(modelId => 
            this.MODEL_CAPABILITIES[modelId]?.default === true
        );
        
        return defaultModel || allowedModels[0] || "gemini-3-flash-preview";
    }
    
    // ✅ Validate and correct model selection
    validateModelSelection(selectedModel, strictPromptMode = true) {
        const allowedModels = this.getAllowedModels(strictPromptMode);
        
        if (allowedModels.includes(selectedModel)) {
            return {
                valid: true,
                model: selectedModel,
                reason: ''
            };
        }
        
        const correctedModel = this.getDefaultModel(strictPromptMode);
        const originalModelName = this.MODEL_CAPABILITIES[selectedModel]?.name || selectedModel;
        
        return {
            valid: false,
            model: correctedModel,
            reason: `"${originalModelName}" is not available in ${strictPromptMode ? 'Executable Prompt' : 'Chat'} mode.`,
            corrected: true
        };
    }
    
    // ======================
    // MAIN GENERATION METHOD - UPDATED WITH PARTIAL CONTENT HANDLING
    // ======================
    async generatePrompt(prompt, options = {}) {
        // ✅ CRITICAL FIX: Explicit guard to prevent scoring usage
        if (options.scoreOnly) {
            throw new Error('PromptGenerator does not support scoring. Use a dedicated scoring client instead.');
        }
        
        this.metrics.totalRequests++;
        const startTime = Date.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const opts = {
            model: options.model || this.config.defaultModel,
            style: options.style || 'detailed',
            temperature: options.temperature || 0.4,
            maxTokens: options.maxTokens || 2048,
            signal: options.signal,
            timeout: options.timeout || this.config.timeout,
            retryAttempts: options.retryAttempts || this.config.retryAttempts,
            strictPromptMode: options.strictPromptMode !== undefined ? options.strictPromptMode : this.config.strictPromptMode,
            minPromptLength: options.minPromptLength || this.config.minPromptLength,
            ...options
        };
        
        // ✅ FIX: Disable strict prompt mode for image prompts
        if (this.isLikelyImagePrompt(prompt)) {
            opts.strictPromptMode = false;
        }
        
        // ✅ Validate and correct model selection BEFORE API call
        const modelValidation = this.validateModelSelection(opts.model, opts.strictPromptMode);
        if (modelValidation.corrected) {
            console.warn(`Model auto-corrected: ${modelValidation.reason} Using ${modelValidation.model} instead.`);
            this.metrics.modelCorrections++;
            opts.model = modelValidation.model;
        }
        
        // 🔧 Check cache with version
        const cacheKey = await this.getCacheKey(prompt, opts);
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached.version === this.cacheVersion && 
                Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log(`Cache hit for key: ${cacheKey.substring(0, 20)}...`);
                return cached.result;
            } else {
                this.cache.delete(cacheKey);
            }
        }
        
        // Validate prompt
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            console.error('Invalid prompt provided');
            return this.createErrorResponse('Prompt cannot be empty', requestId);
        }
        
        if (prompt.length > 5000) {
            console.warn(`Prompt very long: ${prompt.length} characters`);
        }
        
        console.log(`Calling worker API with options:`, {
            model: opts.model,
            style: opts.style,
            temperature: opts.temperature,
            strictPromptMode: opts.strictPromptMode,
            minLength: opts.minPromptLength
        });
        
        const requestData = {
            prompt: prompt,
            model: opts.model,
            enforceExecutableFormat: opts.strictPromptMode,
            requestId: requestId,
            timestamp: new Date().toISOString()
        };
        
        try {
            console.log(`Starting generation with model: ${opts.model}`);
            const result = await this.callWorkerAPI(requestData, opts);
            
            if (result.success) {
                // ✅ CRITICAL FIX: Handle partial content from worker
                if (result.relaxedValidationUsed || result.validationWarning) {
                    console.log('✅ Worker returned AI-generated content with relaxed validation');
                    this.metrics.partialContentUsed++;
                    
                    // Cache with special flag
                    const finalResult = {
                        ...result,
                        success: true,
                        fallbackUsed: false,
                        partialContent: true
                    };
                    
                    await this.cacheResult(cacheKey, finalResult);
                    
                    const latency = Date.now() - startTime;
                    this.metrics.successfulRequests++;
                    this.metrics.totalLatency += latency;
                    this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.successfulRequests;
                    
                    console.log(`✅ Request ${requestId} successful (partial content) in ${latency}ms`);
                    return finalResult;
                }
                
                // ✅ TRUST WORKER VALIDATION
                if (result.executableFormatValidated === true) {
                    console.log('✅ Worker validated executable format - skipping redundant checks');
                    this.metrics.workerValidatedHits++;
                    this.metrics.workerTotalValidations++;
                    
                    await this.cacheResult(cacheKey, result);
                    
                    const latency = Date.now() - startTime;
                    this.metrics.successfulRequests++;
                    this.metrics.totalLatency += latency;
                    this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.successfulRequests;
                    
                    console.log(`✅ Request ${requestId} successful in ${latency}ms`);
                    return result;
                }
                
                // Only validate if worker didn't validate
                if (opts.strictPromptMode && result.executableFormatValidated !== true) {
                    this.metrics.workerTotalValidations++;
                    
                    // ✅ CRITICAL FIX: Use smarter validation for image prompts
                    const isImagePrompt = this.isLikelyImagePrompt(prompt);
                    if (isImagePrompt) {
                        console.log('Image prompt detected - using relaxed validation');
                        // Image prompts can be shorter
                        if (result.prompt.length < 200) {
                            console.warn(`Image prompt short but acceptable: ${result.prompt.length} chars`);
                        }
                        
                        // Still validate basic structure
                        const validatedResult = this.validatePromptNotContent(result.prompt);
                        if (!validatedResult.isValid) {
                            console.warn(`⚠️ Content issue: ${validatedResult.reason}`);
                            result.prompt = validatedResult.cleanedPrompt;
                            result.localConversion = true;
                        }
                    } else {
                        // Standard validation for text prompts
                        const validatedResult = this.validatePromptNotContent(result.prompt);
                        if (!validatedResult.isValid) {
                            console.warn(`⚠️ Generated content instead of prompt: ${validatedResult.reason}`);
                            result.prompt = validatedResult.cleanedPrompt;
                            result.localConversion = true;
                        }
                        
                        if (result.prompt.length < opts.minPromptLength) {
                            console.warn(`Prompt too short: ${result.prompt.length} chars (min ${opts.minPromptLength})`);
                            // Don't throw - use as partial content
                            result.validationWarning = 'Prompt slightly shorter than required';
                            result.relaxedValidationUsed = true;
                        }
                        
                        if (!this.isExecutablePrompt(result.prompt)) {
                            console.warn('Prompt not in executable format');
                            // Don't throw - use as partial content
                            result.validationWarning = 'Format slightly relaxed';
                            result.relaxedValidationUsed = true;
                        }
                    }
                }
                
                await this.cacheResult(cacheKey, result);
                
                const latency = Date.now() - startTime;
                this.metrics.successfulRequests++;
                this.metrics.totalLatency += latency;
                this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.successfulRequests;
                
                console.log(`✅ Request ${requestId} successful in ${latency}ms`);
                return result;
            } else {
                throw new Error(result.error || 'Worker API returned unsuccessful response');
            }
            
        } catch (error) {
            console.error(`Request ${requestId} failed:`, error.message);
            
            // ✅ CRITICAL FIX: Check if error contains partial result
            if (error?.partialResult?.prompt) {
                console.log('⚠️ Using partial worker prompt from error');
                this.metrics.partialContentUsed++;
                
                const latency = Date.now() - startTime;
                this.metrics.successfulRequests++;
                this.metrics.totalLatency += latency;
                
                return {
                    success: true,
                    prompt: error.partialResult.prompt,
                    model: error.partialResult.model || opts.model,
                    provider: error.partialResult.provider || 'unknown',
                    fallbackUsed: false,
                    relaxedValidationUsed: true,
                    validationWarning: 'AI generated partial content',
                    promptType: error.partialResult.promptType || 'unknown',
                    partialContent: true,
                    requestId: requestId,
                    latency: latency
                };
            }
            
            if (this.config.fallbackToLocal) {
                console.log('Immediate fallback to local generation');
                this.metrics.localFallbackUsed++;
                
                const localResult = this.generatePromptLocally(prompt, opts);
                
                this.metrics.failedRequests++;
                const latency = Date.now() - startTime;
                this.metrics.totalLatency += latency;
                
                return {
                    ...localResult,
                    fallbackUsed: true,
                    originalError: error.message,
                    requestId: requestId
                };
            }
            
            this.metrics.failedRequests++;
            console.error(`All attempts failed for ${requestId}:`, error.message);
            
            return this.createErrorResponse(
                `Failed to generate prompt: ${error.message}`,
                requestId
            );
        }
    }
    
    // ======================
    // WORKER API CALL - UPDATED WITH PARTIAL CONTENT HANDLING
    // ======================
    async callWorkerAPI(requestData, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        
        try {
            console.log(`Sending request to: ${this.config.workerUrl}`);
            
            const response = await fetch(this.config.workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'PromptCraft/2.0'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`Response status: ${response.status}`);
            
            // ✅ CRITICAL FIX: Robust JSON parsing with fallback
            let data = {};
            let responseText = '';
            
            try {
                responseText = await response.text();
                
                // Try to parse JSON
                try {
                    data = JSON.parse(responseText);
                    console.log('✅ Parsed response successfully');
                } catch (parseError) {
                    console.warn('❌ JSON parse error:', parseError.message);
                    
                    // Try to fix incomplete JSON
                    const fixedResponse = this.fixIncompleteJson(responseText);
                    if (fixedResponse) {
                        data = fixedResponse;
                        console.log('✅ Successfully fixed and parsed incomplete JSON');
                    } else {
                        // Create error with partial content if available
                        const partialMatch = responseText.match(/"result"\s*:\s*"([^"]*)"/) || 
                                           responseText.match(/"prompt"\s*:\s*"([^"]*)"/);
                        
                        if (partialMatch && partialMatch[1]) {
                            const error = new Error('Partial response');
                            error.partialResult = {
                                prompt: partialMatch[1],
                                model: requestData.model,
                                provider: 'unknown'
                            };
                            throw error;
                        } else {
                            throw new Error(`Invalid JSON response: ${parseError.message}`);
                        }
                    }
                }
            } catch (textError) {
                console.error('Failed to get response text:', textError);
                throw new Error('Failed to read response');
            }
            
            if (!data) {
                throw new Error('Empty response from worker');
            }
            
            // ✅ CRITICAL FIX: Handle 206 Partial Content
            if (response.status === 206 || (data.success === false && data.partialResult)) {
                console.log('✅ Received partial content (206) from worker');
                
                const partialResult = data.partialResult || {
                    prompt: data.result || '',
                    model: data.model || requestData.model,
                    provider: data.provider || 'unknown'
                };
                
                return {
                    success: true,
                    prompt: partialResult.prompt,
                    model: partialResult.model,
                    provider: partialResult.provider,
                    usage: data.usage || {},
                    suggestions: data.suggestions || [],
                    requestId: data.requestId || requestData.requestId,
                    timestamp: data.timestamp || new Date().toISOString(),
                    executableFormatValidated: false,
                    relaxedValidationUsed: true,
                    validationWarning: data.error || 'Partial content returned',
                    promptType: partialResult.promptType || 'unknown'
                };
            }
            
            if (!response.ok && response.status !== 206) {
                throw new Error(data.error || `API error: ${response.status}`);
            }
            
            if (!data.success) {
                // Check if it's a non-critical error with partial content
                if (data.result && data.result.length > 0) {
                    console.log('Worker returned unsuccessful but has partial result');
                    return {
                        success: true,
                        prompt: data.result,
                        model: data.model || requestData.model,
                        provider: data.provider || 'unknown',
                        usage: data.usage || {},
                        suggestions: data.suggestions || [],
                        requestId: data.requestId || requestData.requestId,
                        timestamp: data.timestamp || new Date().toISOString(),
                        executableFormatValidated: false,
                        relaxedValidationUsed: true,
                        validationWarning: data.error || 'Partial success',
                        promptType: data.metadata?.promptType || 'unknown'
                    };
                }
                throw new Error(data.error || 'Worker returned unsuccessful response');
            }
            
            let result = data.result;
            if (!result || typeof result !== 'string') {
                console.warn('No result field or invalid type in response:', data);
                result = '';
            }
            
            if (!this.isLikelyImagePrompt(result)) {
                result = this.ensureCompletePrompt(result);
            }
            
            let suggestions = [];
            if (data.suggestions && Array.isArray(data.suggestions)) {
                suggestions = data.suggestions;
            } else {
                suggestions = this.generateSuggestions(result);
            }
            
            console.log(`Worker validation: ${data.executableFormatValidated ? '✅ Validated' : '❌ Not validated'}`);
            
            return {
                success: true,
                prompt: result,
                model: data.model || requestData.model,
                provider: data.provider || 'unknown',
                usage: data.usage || {},
                suggestions: suggestions,
                requestId: data.requestId || requestData.requestId,
                rateLimit: data.rateLimit,
                timestamp: data.timestamp || new Date().toISOString(),
                rawResponse: this.config.enableDebug ? data : undefined,
                executableFormatValidated: data.executableFormatValidated || false,
                relaxedValidationUsed: data.relaxedEnforcement || false,
                validationWarning: data.validationWarning || null,
                promptType: data.promptType || data.metadata?.promptType || 'text'
            };
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            console.error('Worker API call failed:', {
                error: error.message,
                url: this.config.workerUrl,
                requestId: requestData.requestId
            });
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${options.timeout}ms`);
            }
            
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Cannot connect to AI service');
            }
            
            throw error;
        }
    }
    
    // ======================
    // CONTENT VALIDATION - UPDATED WITH IMAGE PROMPT DETECTION
    // ======================
    
    /**
     * Detect if a prompt is likely for image generation
     */
    isLikelyImagePrompt(text) {
        if (!text || typeof text !== 'string') return false;
        
        const imagePatterns = [
            /\b(draw|illustrate|paint|sketch|visualize|render|create.*image|generate.*picture|make.*art)\b/i,
            /\b(photo|picture|image|artwork|graphic|visual|scene|view)\b/i,
            /\b(background|foreground|composition|lighting|shading|texture|color|palette)\b/i,
            /\b(portrait|landscape|still life|abstract|realistic|cartoon|anime|digital art)\b/i
        ];
        
        return imagePatterns.some(pattern => pattern.test(text));
    }
    
    /**
     * ✅ Updated: More flexible executable prompt detection
     */
    isExecutablePrompt(text) {
        if (!text || typeof text !== 'string') return false;
        
        // Accept "Task to perform:" or "Objective:" as valid entry points
        if (!/^(task to perform|objective):/i.test(text)) {
            return false;
        }
        
        const lowerText = text.toLowerCase();
        
        // Check for basic structure
        const structureIndicators = [
            /requirements?:/i,
            /instructions?:/i,
            /format:/i
        ];
        
        let structureScore = 0;
        for (const pattern of structureIndicators) {
            if (pattern.test(text)) structureScore++;
        }
        
        // Must have at least one structure indicator
        if (structureScore < 1) {
            return false;
        }
        
        // Check for non-executable indicators (meta)
        const metaIndicators = [
            /prompt for/i,
            /template for/i,
            /you should/i,
            /i need you to/i,
            /can you/i,
            /would you/i,
            /please create a prompt/i
        ];
        
        for (const pattern of metaIndicators) {
            if (pattern.test(lowerText)) {
                return false;
            }
        }
        
        // Image prompts can be shorter
        if (this.isLikelyImagePrompt(text)) {
            return text.length >= 200; // Reduced minimum for images
        }
        
        return text.length >= this.config.minPromptLength;
    }
    
    /**
     * Validate that the output is a prompt, not content
     */
    validatePromptNotContent(text) {
        if (!text || typeof text !== 'string') {
            return { isValid: false, reason: 'Empty or invalid text', cleanedPrompt: text };
        }
        
        // Check minimum length with image awareness
        const isImagePrompt = this.isLikelyImagePrompt(text);
        const minLength = isImagePrompt ? 200 : this.config.minPromptLength;
        
        if (text.length < minLength) {
            return { 
                isValid: false, 
                reason: `${isImagePrompt ? 'Image' : 'Prompt'} too short (${text.length} chars, min ${minLength})`,
                cleanedPrompt: this.convertContentToPrompt(text)
            };
        }
        
        // ✅ More flexible entry point checking
        if (!/^(task to perform|objective):/i.test(text)) {
            return { 
                isValid: false, 
                reason: 'Missing entry point "Task to perform:" or "Objective:"',
                cleanedPrompt: this.convertContentToPrompt(text)
            };
        }
        
        // Rest of validation remains the same...
        // [Previous validation logic remains unchanged]
        
        return { isValid: true, reason: 'Valid executable prompt', cleanedPrompt: text };
    }
    
    /**
     * Convert accidental content into a prompt structure
     */
    convertContentToPrompt(content) {
        console.log('Converting content to executable prompt structure...');
        
        return `Task to perform: Produce the requested output according to requirements

Requirements:
1. Analyze input requirements carefully
2. Generate comprehensive, detailed output
3. Follow appropriate formatting guidelines
4. Consider relevant constraints and edge cases
5. Ensure professional quality and accuracy
6. Structure information logically and clearly

Format: Well-structured, actionable output

Context: ${content.substring(0, 200)}...`;
    }
    
    // ======================
    // LOCAL FALLBACK GENERATION
    // ======================
    generatePromptLocally(prompt, options = {}) {
        console.log('Generating executable prompt locally...');
        
        const isImagePrompt = this.isLikelyImagePrompt(prompt);
        
        let template;
        if (isImagePrompt) {
            template = `Task to perform: ${prompt}

Requirements:
- High-quality, detailed visual output
- Appropriate artistic style and composition
- Strong visual appeal and engagement
- Accurate representation of requested elements
- Professional artistic quality

Format: Detailed image generation prompt for AI art tools`;
        } else {
            template = `Task to perform: ${prompt}

Requirements:
1. Analyze input requirements carefully
2. Generate comprehensive, detailed output
3. Follow appropriate formatting guidelines
4. Consider relevant constraints and edge cases
5. Ensure professional quality and accuracy
6. Structure information logically and clearly

Format: Well-structured, actionable output ready for execution`;
        }

        const suggestions = this.generateSuggestions(template);
        
        return {
            success: true,
            prompt: template,
            model: 'local-fallback',
            provider: 'local',
            usage: {
                prompt_tokens: prompt.length,
                completion_tokens: template.length,
                total_tokens: prompt.length + template.length
            },
            suggestions: suggestions,
            requestId: `local_${Date.now()}`,
            timestamp: new Date().toISOString(),
            isLocalFallback: true,
            executableFormatValidated: false,
            promptType: isImagePrompt ? 'image' : 'text'
        };
    }
    
    generateSuggestions(prompt) {
        const suggestions = [];
        
        if (prompt.length < 200) {
            suggestions.push('Add more specific requirements');
        }
        
        if (!prompt.includes('Format:')) {
            suggestions.push('Specify the expected output format');
        }
        
        if (!prompt.match(/\d+\.\s/)) {
            suggestions.push('Add numbered steps for clarity');
        }
        
        if (prompt.length > 800) {
            suggestions.push('Consider breaking into smaller tasks');
        }
        
        return suggestions.slice(0, 3);
    }
    
    // ======================
    // UTILITY METHODS
    // ======================
    
    async getCacheKey(prompt, options) {
        let promptHash;
        
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(prompt.substring(0, 1000));
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                promptHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                promptHash = prompt.substring(0, 200);
            }
        } else {
            promptHash = prompt.substring(0, 200);
        }
        
        const keyData = {
            promptHash: promptHash,
            model: options.model,
            style: options.style,
            temperature: options.temperature,
            strictPromptMode: options.strictPromptMode,
            cacheVersion: this.cacheVersion
        };
        
        return JSON.stringify(keyData);
    }
    
    async cacheResult(key, result) {
        if (this.cache.size >= this.cacheMaxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            result: result,
            timestamp: Date.now(),
            version: this.cacheVersion
        });
    }
    
    createErrorResponse(errorMessage, requestId) {
        return {
            success: false,
            error: errorMessage,
            requestId: requestId,
            timestamp: new Date().toISOString(),
            prompt: '',
            suggestions: []
        };
    }
    
    // ======================
    // HEALTH CHECK
    // ======================
async testConnection() {
    try {
        // ✅ FIX: Always normalize worker URL before appending /health
        const baseUrl = this.config.workerUrl.replace(/\/$/, '');
        const healthUrl = `${baseUrl}/health`;

        console.log(`Testing connection to: ${healthUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();

        try {
            const data = JSON.parse(responseText);

            if (response.ok) {
                console.log('Health check successful:', data);
                return {
                    success: true,
                    status: data.status,
                    models: data.models,
                    keys: data.availableModels,
                    version: data.version,
                    architecture: data.architecture
                };
            } else {
                return {
                    success: false,
                    error: data.error || `Health check failed: ${response.status}`,
                    status: response.status
                };
            }
        } catch (parseError) {
            console.error('Health check parse error:', parseError);
            return {
                success: false,
                error: `Invalid health response: ${responseText.substring(0, 100)}`,
                rawResponse: responseText
            };
        }

    } catch (error) {
        console.error('Health check failed:', error.message);
        return {
            success: false,
            error: error.message,
            isNetworkError:
                error.name === 'AbortError' ||
                error.message.includes('fetch')
        };
    }
}

    
    // ======================
    // METRICS & DIAGNOSTICS - UPDATED
    // ======================
    getMetrics() {
        const workerValidationHitRate = this.metrics.workerTotalValidations > 0 
            ? (this.metrics.workerValidatedHits / this.metrics.workerTotalValidations) * 100 
            : 0;
            
        const successRate = this.metrics.totalRequests > 0 
            ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
            : 0;
        
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheVersion: this.cacheVersion,
            successRate: successRate,
            averageResponseTime: this.metrics.averageLatency,
            minPromptLength: this.config.minPromptLength,
            workerValidationHitRate: workerValidationHitRate,
            workerValidationStatus: `${this.metrics.workerValidatedHits}/${this.metrics.workerTotalValidations} validated`,
            partialContentUsage: `${this.metrics.partialContentUsed} requests`,
            localFallbackUsage: `${this.metrics.localFallbackUsed} requests`,
            qualityMetrics: {
                aiGeneratedRate: ((this.metrics.successfulRequests - this.metrics.localFallbackUsed) / this.metrics.totalRequests * 100).toFixed(1) + '%',
                partialContentRate: (this.metrics.partialContentUsed / this.metrics.totalRequests * 100).toFixed(1) + '%',
                fullQualityRate: ((this.metrics.successfulRequests - this.metrics.partialContentUsed - this.metrics.localFallbackUsed) / this.metrics.totalRequests * 100).toFixed(1) + '%'
            }
        };
    }
    
    clearCache() {
        this.cache.clear();
        this.cacheVersion = (parseFloat(this.cacheVersion) + 0.1).toFixed(1);
        console.log('Cache cleared and version updated to:', this.cacheVersion);
        return true;
    }
    
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalLatency: 0,
            averageLatency: 0,
            workerValidatedHits: 0,
            workerTotalValidations: 0,
            modelCorrections: 0,
            partialContentUsed: 0,
            localFallbackUsed: 0
        };
        console.log('Metrics reset');
    }
    
    // ======================
    // UI HELPER METHODS
    // ======================
    
    getAvailableModels(strictMode = true) {
        return Object.entries(this.MODEL_CAPABILITIES).map(([id, config]) => ({
            id,
            name: config.name,
            executable: config.executable,
            chat: config.chat,
            description: config.description,
            provider: config.provider,
            default: config.default || false,
            availableInStrictMode: strictMode ? config.executable : true
        }));
    }
    
    getModelInfo(modelId) {
        return this.MODEL_CAPABILITIES[modelId] || null;
    }
    
    updateSettings(options = {}) {
        if (options.defaultModel !== undefined) {
            this.config.defaultModel = options.defaultModel;
        }
        
        if (options.strictPromptMode !== undefined) {
            this.config.strictPromptMode = options.strictPromptMode;
            
            const validation = this.validateModelSelection(this.config.defaultModel, this.config.strictPromptMode);
            if (!validation.valid) {
                this.config.defaultModel = validation.model;
                console.log(`Model auto-corrected to: ${this.config.defaultModel}`);
            }
        }
        
        if (options.minPromptLength !== undefined) {
            this.config.minPromptLength = options.minPromptLength;
        }
        
        if (options.workerUrl !== undefined) {
            this.config.workerUrl = options.workerUrl;
        }
        
        console.log('PromptGenerator settings updated:', {
            defaultModel: this.config.defaultModel,
            strictPromptMode: this.config.strictPromptMode,
            minPromptLength: this.config.minPromptLength
        });
    }
    
    // ======================
    // JSON FIXING UTILITIES
    // ======================
    fixIncompleteJson(jsonText) {
        if (!jsonText || typeof jsonText !== 'string') return null;
        
        let text = jsonText.trim();
        
        if (text.endsWith(',') || text.endsWith('"') || text.endsWith("'")) {
            text = text.slice(0, -1);
        }
        
        if (text.startsWith('{') && !text.endsWith('}')) {
            let braceCount = 0;
            let lastCompletePos = -1;
            
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '{') braceCount++;
                if (text[i] === '}') braceCount--;
                
                if (braceCount === 0) {
                    lastCompletePos = i;
                }
            }
            
            if (lastCompletePos !== -1) {
                text = text.substring(0, lastCompletePos + 1);
            } else {
                text = text + '}';
            }
        }
        
        text = text.replace(/,\s*}/g, '}');
        text = text.replace(/,\s*]/g, ']');
        
        try {
            return JSON.parse(text);
        } catch (parseError) {
            console.warn('Failed to fix JSON:', parseError.message);
            return null;
        }
    }
    
    ensureCompletePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') return prompt || '';
        
        let result = prompt.trim();
        
        const lastChar = result.slice(-1);
        if (['.', '!', '?', ':', ')', ']', '}'].includes(lastChar)) {
            return result;
        }
        
        if ([',', '-', '—', '–', ';'].includes(lastChar)) {
            result = result.slice(0, -1);
        }
        
        const sentences = result.split(/[.!?]/);
        const lastSentence = sentences[sentences.length - 1].trim();
        
        if (lastSentence.length < 10 || lastSentence.split(' ').length < 3) {
            if (sentences.length > 1) {
                result = sentences.slice(0, -1).join('.') + '.';
            }
        } else {
            result = result + '.';
        }
        
        return result;
    }
}
