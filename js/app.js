// ============================================
// PROMPTCRAFT PRO - MAIN APPLICATION CONTROLLER
// Version: 2.0.2 - FINAL FIXES
// ============================================

// MODEL VALIDATION FUNCTIONS
const MODEL_CAPABILITIES = {
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
  "llama-3.1-8b-instant": {
    name: "LLaMA 3.1 Instant",
    executable: false,
    chat: true,
    description: "Fast chat & execution (not for prompt generation)",
    provider: "groq",
    default: false
  }
};

function validateModelForMode(modelId, strictMode) {
  const model = MODEL_CAPABILITIES[modelId];
  if (!model) return { valid: false, reason: "Model not found" };
  
  if (strictMode && !model.executable) {
    return {
      valid: false,
      reason: `${model.name} is not available in Executable Prompt mode`,
      correctedModel: "gemini-3-flash-preview"
    };
  }
  
  return { valid: true, model: model };
}

// Then in your model selection UI (wherever you have dropdowns):
function updateModelDropdown(strictMode) {
  const dropdown = document.getElementById('model-selector');
  if (!dropdown) return;
  
  // Clear existing options
  dropdown.innerHTML = '';
  
  // Add available models
  Object.entries(MODEL_CAPABILITIES).forEach(([id, config]) => {
    if (strictMode && !config.executable) {
      // Add as disabled option
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${config.name} (Executable mode not available)`;
      option.disabled = true;
      dropdown.appendChild(option);
    } else {
      // Add as available option
      const option = document.createElement('option');
      option.value = id;
      option.textContent = config.name;
      if (config.default) option.selected = true;
      dropdown.appendChild(option);
    }
  });
}

// Call this when strict mode toggles
function onStrictModeToggle(isStrict) {
  updateModelDropdown(isStrict);
  
  // Also validate current selection
  const currentModel = document.getElementById('model-selector').value;
  const validation = validateModelForMode(currentModel, isStrict);
  
  if (!validation.valid && validation.correctedModel) {
    // Auto-correct and show toast
    document.getElementById('model-selector').value = validation.correctedModel;
    window.promptCraftApp?.showNotification(validation.reason, 'warning');
  }
}

// ======================
// SCORING API HELPER (NEW - DIRECT WORKER CALL)
// ======================
async function scorePromptViaWorker(prompt) {
    const workerUrl = window.AppConfig?.WORKER_CONFIG?.workerUrl || 
                     'https://promptcraft-api.vijay-shagunkumar.workers.dev';
    
    // Remove trailing slash to prevent double slashes
    const baseUrl = workerUrl.replace(/\/$/, '');
    
    try {
        console.log('🔍 Calling scoring endpoint...');
        const response = await fetch(
            `${baseUrl}/score`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    prompt: prompt,
                    tool: 'chatgpt'
                }),
                signal: AbortSignal.timeout(8000)
            }
        );

        if (!response.ok) {
            console.warn(`⚠️ Score API returned ${response.status}, using fallback data`);
            return generateMockScore(prompt);
        }

        const data = await response.json();
        console.log('✅ Score API response received:', {
            totalScore: data.totalScore,
            grade: data.grade,
            transformed: data.transformed || false
        });
        
        // ✅ Extract from transformed response
        return {
            clarityAndIntent: data.clarityAndIntent || 14,
            structure: data.structure || 11,
            contextAndRole: data.contextAndRole || 12,
            totalScore: data.totalScore || 37,
            grade: data.grade || 'Very Good',
            feedback: data.feedback || 'Prompt analysis complete.',
            isMockData: data.isFallback || false,
            transformed: data.transformed || false,
            originalJavaData: data.originalJavaData || null,
            promptLength: prompt.length,
            promptWords: prompt.split(/\s+/).filter(Boolean).length
        };
        
    } catch (error) {
        console.warn('⚠️ Score API error, using mock data:', error.message);
        return generateMockScore(prompt);
    }
}

// ======================
// MOCK SCORE GENERATOR (FALLBACK)
// ======================
function generateMockScore(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        return {
            clarityAndIntent: 0,
            structure: 0,
            contextAndRole: 0,
            totalScore: 0,
            grade: 'Inadequate',
            feedback: 'Prompt is empty or invalid.',
            isMockData: true,
            promptLength: 0,
            promptWords: 0
        };
    }
    
    // Simple heuristic scoring based on prompt length and structure
    const length = prompt.length;
    const words = prompt.split(/\s+/).filter(Boolean).length;
    const lines = prompt.split('\n').length;
    const hasStructure = /(task|objective|requirements|instructions):/i.test(prompt);
    const hasFormat = /format:/i.test(prompt);
    const hasNumberedList = /\d+\.\s/.test(prompt);
    
    // Calculate scores
    let clarityAndIntent = 10;
    let structure = 10;
    let contextAndRole = 10;
    
    // Adjust based on content
    if (length > 500) clarityAndIntent += 5;
    if (words > 100) clarityAndIntent += 3;
    if (lines > 5) structure += 5;
    if (hasStructure) structure += 8;
    if (hasFormat) structure += 5;
    if (hasNumberedList) contextAndRole += 5;
    
    // Cap at maximums
    clarityAndIntent = Math.min(clarityAndIntent, 20);
    structure = Math.min(structure, 15);
    contextAndRole = Math.min(contextAndRole, 15);
    
    const totalScore = clarityAndIntent + structure + contextAndRole;
    
    // Determine grade
    let grade;
    if (totalScore >= 45) grade = 'Excellent';
    else if (totalScore >= 40) grade = 'Very Good';
    else if (totalScore >= 30) grade = 'Good';
    else if (totalScore >= 20) grade = 'Fair';
    else if (totalScore >= 10) grade = 'Poor';
    else grade = 'Inadequate';
    
    return {
        clarityAndIntent,
        structure,
        contextAndRole,
        totalScore,
        grade,
        feedback: `Grade: ${grade}. ${grade === 'Excellent' ? 'Excellent prompt structure!' : 'Consider adding more specific requirements.'}`,
        isMockData: true,
        promptLength: length,
        promptWords: words
    };
}

// ======================
// MAIN APPLICATION CONTROLLER
// ======================
class PromptCraftApp {
    constructor() {
        // ======================
        // GLOBAL ERROR FILTER (REGISTER ONCE – PRODUCTION SAFE)
        // ======================
        if (!window.__PROMPTCRAFT_ERROR_HANDLER__) {
            window.__PROMPTCRAFT_ERROR_HANDLER__ = true;

            window.addEventListener('error', (event) => {
                if (
                    !event.filename ||                             // anonymous / injected
                    event.filename === window.location.href ||     // index.html noise
                    event.lineno === 1 ||                          // inline scripts / CF runtime
                    !event.filename.includes('/js/')               // not our JS files
                ) {
                    return;
                }

                console.error('App error:', {
                    message: event.message,
                    file: event.filename,
                    line: event.lineno,
                    column: event.colno
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                if (
                    !event.reason ||
                    !event.reason.stack ||
                    (
                        !event.reason.stack.includes('app.js') &&
                        !event.reason.stack.includes('prompt-generator.js')
                    )
                ) {
                    return;
                }

                console.error('Unhandled app promise rejection:', event.reason);
            });
        }

        // ======================
        // APP STATE
        // ======================
        this.state = {
            currentStep: 1,
            hasGeneratedPrompt: false,
            promptModified: false,
            originalPrompt: null,
            selectedPlatform: null,
            isEditorOpen: false,
            currentEditor: null,
            inspirationPanelOpen: false,
            settingsModified: false,
            undoStack: [],
            redoStack: [],
            promptHistory: [],
            currentModel: 'gemini-3-flash-preview',
            generatedFromInput: null,
            lastPromptScore: null,
            settings: this.loadDefaultSettings()
        };

        // Score mutex flag to prevent double API calls
        this._scoreInFlight = false;

        // Configuration
        this.config = window.AppConfig || {
            WORKER_CONFIG: {
                workerUrl: 'https://promptcraft-api.vijay-shagunkumar.workers.dev',
                defaultModel: 'gemini-3-flash-preview'
            }
        };
        
        // ======================
        // INITIALIZE MANAGERS
        // ======================
        this.storageManager = new StorageManager();

        this.voiceHandler = new VoiceHandler({
            continuous: false,
            interimResults: false,
            defaultLang: this.state.settings.voiceInputLanguage || 'en-US',
            maxListenTime: 10000,
            maxSimilarityThreshold: 0.75,
            replaceMode: true,
            mergeProgressiveResults: true,
            debounceDelay: 400
        });
        
        this.platformIntegrations = new PlatformIntegrations();
        this.promptGenerator = new PromptGenerator({
            workerUrl: this.config.WORKER_CONFIG?.workerUrl,
            defaultModel: this.config.WORKER_CONFIG?.defaultModel,
            timeout: 30000,
            fallbackToLocal: true,
            enableDebug: true,
            strictPromptMode: true
        });

        // Bind elements (with null safety)
        this.elements = {};
        this.bindElements();
        
        // Initialize
        this.init();
    }

    // Load default settings
    loadDefaultSettings() {
        return {
            theme: 'dark',
            uiDensity: 'comfortable',
            defaultModel: 'gemini-3-flash-preview',
            promptStyle: 'detailed',
            autoConvertDelay: 0,
            voiceInputLanguage: 'en-US',
            voiceOutputLanguage: 'en-US',
            interfaceLanguage: 'en',
            maxHistoryItems: 25,
            notificationDuration: 3000,
            autoScoreEnabled: true
        };
    }

    // Bind DOM elements with null safety
    bindElements() {
        this.elements = {
            // Input
            userInput: document.getElementById('userInput'),
            charCounter: document.getElementById('charCounter'),
            clearInputBtn: document.getElementById('clearInputBtn'),
            micBtn: document.getElementById('micBtn'),
            maximizeInputBtn: document.getElementById('maximizeInputBtn'),
            needInspirationBtn: document.getElementById('needInspirationBtn'),
            
            // Output
            outputSection: document.getElementById('outputSection'),
            outputArea: document.getElementById('outputArea'),
            copyBtn: document.getElementById('copyBtn'),
            speakBtn: document.getElementById('speakBtn'),
            exportBtn: document.getElementById('exportBtn'),
            maximizeOutputBtn: document.getElementById('maximizeOutputBtn'),
            savePromptBtn: document.getElementById('savePromptBtn'),
            
            // Platforms
            platformsGrid: document.getElementById('platformsGrid'),
            platformsEmptyState: document.getElementById('platformsEmptyState'),
            
            // Buttons (with null safety)
            stickyPrepareBtn: document.getElementById('stickyPrepareBtn'),
            stickyResetBtn: document.getElementById('stickyResetBtn'),
            
            // Metrics
            metricsBtn: document.querySelector('.metrics-toggle'),
            metricsBox: document.querySelector('.ranking-explanation'),
            metricsCloseBtn: document.querySelector('.metrics-close-btn'),
            
            // Inspiration
            inspirationPanel: document.getElementById('inspirationPanel'),
            closeInspirationBtn: document.getElementById('closeInspirationBtn'),
            
            // History
            historyBtn: document.getElementById('historyBtn'),
            historySection: document.getElementById('historySection'),
            historyList: document.getElementById('historyList'),
            closeHistoryBtn: document.getElementById('closeHistoryBtn'),
            
            // Suggestions
            suggestionsPanel: document.getElementById('suggestionsPanel'),
            suggestionsList: document.getElementById('suggestionsList'),
            
            // Progress
            progressFill: document.getElementById('progressFill'),
            
            // Footer
            currentModel: document.getElementById('currentModel'),
            currentTheme: document.getElementById('currentTheme'),
            currentLanguage: document.getElementById('currentLanguage'),
            
            // App container
            appContainer: document.querySelector('.app-container'),
            
            // Editor elements
            editorMicBtn: document.getElementById('editorMicBtn'),
            
            // Settings elements
            settingsBtn: document.getElementById('settingsBtn'),
            
            // Notification container (create if doesn't exist)
            notificationContainer: document.getElementById('notificationContainer') || this.createNotificationContainer()
        };
        
        // Add tooltip to inspiration button if it exists
        if (this.elements.needInspirationBtn) {
            this.elements.needInspirationBtn.title = 'Click to insert ready-made prompt samples';
        }
    }

    // Create notification container if it doesn't exist
    createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.id = 'notificationContainer';
        document.body.appendChild(container);
        return container;
    }

    // Initialize application
    async init() {
        console.log('Initializing PromptCraft Pro...');
        
        try {
            // Load settings
            this.loadSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up score invalidation and metrics toggle
            this.setupScoreInvalidation();
            this.setupMetricsToggle();
            
            // Set up voice handler callbacks
            this.setupVoiceCallbacks();
            
            // Update UI
            this.updateUI();
            
            // Load history
            this.loadHistory();
            
            // Test worker connection (don't block initialization)
            this.testWorkerConnection().catch(error => {
                console.warn('Worker test failed, continuing with local mode:', error);
            });
            
            // Update model display
            this.updateModelDisplay();
            
            console.log('PromptCraft Pro initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize PromptCraft:', error);
            this.showNotification('Failed to initialize application. Please refresh the page.', 'error');
        }
    }

    // Set up score invalidation listeners
    setupScoreInvalidation() {
        const outputArea = document.getElementById('outputArea');
        if (!outputArea) return;
        
        let userEditing = false;
        
        // ✅ FIXED ISSUE 4: Consolidated edit detection - only listen here
      
outputArea.addEventListener('input', () => {
    if (!userEditing && !this.state.promptModified) {
        userEditing = true;
        this.markScoreAsStale();
    }
});


        // Reset stale flag when a fresh score is rendered
        document.addEventListener('promptScoreRendered', () => {
            userEditing = false;
        });
    }

    // Set up metrics toggle listener
    setupMetricsToggle() {
        if (!this.elements.metricsBtn || !this.elements.metricsBox || !this.elements.metricsCloseBtn) return;
        
        this.elements.metricsBtn.addEventListener('click', () => {
            if (!this.state.lastPromptScore) {
                this.showNotification('📊 Re-scoring edited prompt…', 'info');
                this.autoScorePromptIfEnabled(true);
                return;
            }
            
            this.elements.metricsBox.classList.add('active');
        });
        
        this.elements.metricsCloseBtn.addEventListener('click', () => {
            this.elements.metricsBox.classList.remove('active');
        });
    }

    // Set up event listeners with null safety
    setupEventListeners() {
        // Input handling
        if (this.elements.userInput) {
            this.elements.userInput.addEventListener('input', () => this.handleInputChange());
        }
        
        // Clear input button (optional)
        if (this.elements.clearInputBtn) {
            this.elements.clearInputBtn.addEventListener('click', () => {
                if (this.elements.userInput) {
                    this.elements.userInput.value = '';
                    this.clearGeneratedPrompt();
                    this.updateButtonStates();
                }
            });
        }
        
        // Button events (with null safety)
        if (this.elements.stickyPrepareBtn) {
            this.elements.stickyPrepareBtn.addEventListener('click', () => this.preparePrompt());
        }
        
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => this.copyPrompt());
        }
        
        if (this.elements.speakBtn) {
            this.elements.speakBtn.addEventListener('click', () => this.toggleSpeech());
        }
        
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportPrompt());
        }
        
        if (this.elements.savePromptBtn) {
            this.elements.savePromptBtn.addEventListener('click', () => this.savePrompt());
        }
        
        if (this.elements.stickyResetBtn) {
            this.elements.stickyResetBtn.addEventListener('click', () => this.resetApplication());
        }
        
        // Voice button
        if (this.elements.micBtn) {
            this.elements.micBtn.addEventListener('click', () => this.toggleVoiceInput());
        }
        
        // Maximize buttons
        if (this.elements.maximizeInputBtn) {
            this.elements.maximizeInputBtn.addEventListener('click', () => this.openFullScreenEditor('input'));
        }
        
        if (this.elements.maximizeOutputBtn) {
            this.elements.maximizeOutputBtn.addEventListener('click', () => this.openFullScreenEditor('output'));
        }
        
        // Inspiration
        if (this.elements.needInspirationBtn) {
            this.elements.needInspirationBtn.addEventListener('click', () => this.toggleInspirationPanel());
        }
        
        if (this.elements.closeInspirationBtn) {
            this.elements.closeInspirationBtn.addEventListener('click', () => this.closeInspirationPanel());
        }
        
        // History
        if (this.elements.historyBtn) {
            this.elements.historyBtn.addEventListener('click', () => this.toggleHistory());
        }
        
        if (this.elements.closeHistoryBtn) {
            this.elements.closeHistoryBtn.addEventListener('click', () => this.closeHistory());
        }
        
        // Platform clicks
        if (this.elements.platformsGrid) {
            this.elements.platformsGrid.addEventListener('click', (e) => {
                const platformCard = e.target.closest('.platform-card');
                if (platformCard) {
                    this.handlePlatformClick(platformCard.dataset.platform);
                }
            });
        }
        
        // Output editing
        if (this.elements.outputArea) {
            // ✅ FIXED ISSUE 4: Removed duplicate markScoreAsStale call here
            this.elements.outputArea.addEventListener('input', () => this.handlePromptEdit());
            this.elements.outputArea.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                const selection = window.getSelection();
                
                if (selection.rangeCount) {
                    selection.deleteFromDocument();
                    selection.getRangeAt(0).insertNode(document.createTextNode(text));
                }
            });
        }
        
        // Inspiration items
        document.querySelectorAll('.inspiration-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.insertExample(e.currentTarget.dataset.type);
                this.closeInspirationPanel();
            });
        });
        
        // Settings button
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // Settings modal buttons (these might be in a different file)
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        }
        
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
        }
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettingsModal());
        }
        
        // Close settings when clicking outside
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeSettings();
                }
            });
            
            // Enable save button when form changes
            settingsModal.addEventListener('change', () => {
                if (saveSettingsBtn) {
                    saveSettingsBtn.disabled = false;
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Auto-generation
        this.setupAutoGeneration();
    }

    // Set up voice handler callbacks
    setupVoiceCallbacks() {
        this.voiceHandler.setCallbacks({
            onListeningStart: () => {
                this.showNotification('🎤 Listening... Speak now', 'info');
                // Visual feedback
                if (this.elements.micBtn) {
                    this.elements.micBtn.classList.add('listening');
                    this.elements.micBtn.innerHTML = '<i class="fas fa-circle"></i>';
                }
            },
            onListeningEnd: () => {
                // Clear visual feedback
                if (this.elements.micBtn) {
                    this.elements.micBtn.classList.remove('listening');
                    this.elements.micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                }
            },
            onTranscript: (text, metadata = {}) => {
                console.log('🎯 Voice input received:', {
                    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    isFinal: metadata.isFinal,
                    replaceMode: metadata.replaceMode,
                    similarityCheck: metadata.similarityCheck
                });
                
                // Only process FINAL results
                if (metadata.isFinal) {
                    if (this.state.isEditorOpen && this.state.currentEditor === 'input') {
                        const editor = document.getElementById('editorTextarea');
                        if (editor) {
                            editor.value = text;
                            editor.selectionStart = editor.selectionEnd = text.length;
                            editor.focus();
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    } else if (this.elements.userInput) {
                        this.elements.userInput.value = text;
                        this.elements.userInput.selectionStart = 
                        this.elements.userInput.selectionEnd = text.length;
                        this.elements.userInput.focus();
                        
                        this.handleInputChange();
                    }
                    
                    // Show success notification
                    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
                    if (wordCount > 2) {
                        this.showNotification(`✓ ${wordCount} words added via voice`, 'success', 2000);
                    }
                }
            },
            onSpeakingStart: () => {
                this.showNotification('🔊 Reading prompt...', 'info');
            },
            onSpeakingEnd: () => {
                this.showNotification('Finished reading prompt', 'info');
            },
            onError: (error) => {
                const errorLower = error.toLowerCase();
                if (errorLower.includes('not supported')) {
                    this.showNotification('Voice features not available in your browser', 'warning');
                } else if (errorLower.includes('permission') || errorLower.includes('not-allowed')) {
                    this.showNotification('Please allow microphone access', 'error');
                } else if (errorLower.includes('network')) {
                    this.showNotification('Network error. Check your connection', 'error');
                } else if (!errorLower.includes('aborted')) {
                    this.showNotification(`Voice error: ${error}`, 'error');
                }
            }
        });
    }

    // Set up auto-generation
    setupAutoGeneration() {
        let debounceTimer;
        if (this.elements.userInput) {
            this.elements.userInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                
                const delay = this.state.settings.autoConvertDelay;
                if (delay > 0 && this.elements.userInput.value.trim().length > 10) {
                    this.elements.userInput.classList.add('auto-generating');
                    
                    debounceTimer = setTimeout(() => {
                        if (this.elements.userInput.value.trim().length > 10) {
                            this.preparePrompt();
                        }
                        this.elements.userInput.classList.remove('auto-generating');
                    }, delay);
                }
            });
        }
    }

    // Handle input changes
    handleInputChange() {
        if (!this.elements.userInput || !this.elements.charCounter) return;
        
        const text = this.elements.userInput.value;
        const charCount = text.length;
        const maxLength = 5000;

        this.elements.charCounter.textContent = `${charCount}/${maxLength}`;
        this.elements.charCounter.style.color =
            charCount > maxLength * 0.9 ? 'var(--danger)' : 'var(--text-tertiary)';

        // CORE FIX — input changed AFTER generation
        if (
            this.state.hasGeneratedPrompt &&
            text.trim() !== this.state.generatedFromInput
        ) {
            this.state.hasGeneratedPrompt = false;

            // swap buttons back
            if (this.elements.stickyResetBtn) {
                this.elements.stickyResetBtn.style.display = 'none';
            }
            if (this.elements.stickyPrepareBtn) {
                this.elements.stickyPrepareBtn.style.display = 'flex';
            }

            if (this.elements.outputSection) {
                this.elements.outputSection.classList.remove('visible');
            }
          
            this.state.selectedPlatform = null;
        }

        this.updateButtonStates();
    }

    // Handle prompt editing
    handlePromptEdit() {
        if (!this.elements.outputArea) return;

        const currentContent = this.elements.outputArea.textContent.trim();
        const modified = currentContent !== this.state.originalPrompt;

        if (modified && !this.state.promptModified) {
            this.markScoreAsStale();
        }

        this.state.promptModified = modified;
        this.updateButtonStates();
    }

    // ======================
    // PROMPT GENERATION
    // ======================

    async preparePrompt() {
        if (!this.elements.userInput) return;
        
        const inputText = this.elements.userInput.value.trim();
        
        if (!inputText) {
            this.showNotification('Please describe your task first', 'error');
            return;
        }
        
        if (inputText.length < 10) {
            this.showNotification('Please provide more details for better results', 'warning');
            return;
        }
        
        let selectedModel = this.state.currentModel || 'gemini-3-flash-preview';

        const validation = validateModelForMode(selectedModel, true);
        if (!validation.valid && validation.correctedModel) {
            this.showNotification(validation.reason, 'warning');
            selectedModel = validation.correctedModel;
            this.state.currentModel = validation.correctedModel;
        }
        
        this.showLoading(true);
        
        try {
            console.log(`=== STARTING PROMPT GENERATION ===`);
            console.log(`Model: ${selectedModel}`);
            console.log(`Input length: ${inputText.length} chars`);
            console.log(`Input preview: ${inputText.substring(0, 100)}...`);
            
            const result = await this.promptGenerator.generatePrompt(inputText, {
                model: selectedModel,
                style: 'detailed',
                temperature: 0.4,
                timeout: 25000,
                strictPromptMode: true
            });
            
            console.log('Generation result:', {
                success: result.success,
                promptLength: result.prompt?.length || 0,
                fallbackUsed: result.fallbackUsed || false,
                model: result.model,
                provider: result.provider
            });
            
            if (result.success && result.prompt) {
                // Clear score immediately before setting new text
                this.state.lastPromptScore = null;

                const success = this.setOutputText(result.prompt);
                
                if (!success) {
                    throw new Error('Failed to safely display prompt');
                }
                
                this.state.originalPrompt = result.prompt;
                this.state.promptModified = false;
                this.state.hasGeneratedPrompt = true;
                this.state.generatedFromInput = inputText;
                
                // Hide Prepare button, show Reset button
                if (this.elements.stickyPrepareBtn) {
                    this.elements.stickyPrepareBtn.style.display = 'none';
                }
                if (this.elements.stickyResetBtn) {
                    this.elements.stickyResetBtn.style.display = 'flex';
                }
                
                if (this.elements.outputSection) {
                    this.elements.outputSection.classList.add('visible');
                }
                // Auto-scroll to generated prompt
                setTimeout(() => {
                    this.elements.outputSection?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 150);
                
                if (this.elements.platformsGrid && this.elements.platformsEmptyState) {
                    this.platformIntegrations.renderPlatforms(this.elements.platformsGrid);
                }
                
                this.updateProgress();
                this.updateButtonStates();
                
                if (result.suggestions && result.suggestions.length > 0) {
                    this.showSuggestions(result.suggestions);
                }
                
                this.saveToHistory(inputText, result.prompt, result.model);
                
                const modelDisplayName = this.getModelDisplayName(result.model);
                const fallbackNote = result.fallbackUsed ? ' (using fallback)' : '';
                this.showNotification(`Prompt generated successfully with ${modelDisplayName}${fallbackNote}!`, 'success');
                
                console.log(`=== GENERATION SUCCESSFUL ===`);
                console.log(`Final prompt length: ${result.prompt.length} chars`);
                console.log(`Prompt preview: ${result.prompt.substring(0, 200)}...`);
                
                // AUTO-SCORE AFTER GENERATION
            const scoreTimeout = setTimeout(() => {
    if (this.state.hasGeneratedPrompt) {
        this.autoScorePromptIfEnabled();
    }
}, 1000);

                
            } else {
                throw new Error('Failed to generate prompt');
            }
            
        } catch (error) {
            console.error('Prompt generation error:', error);
            this.showNotification(`Failed to generate with ${selectedModel}. Trying fallback...`, 'warning');
            
            await this.tryFallbackModels(inputText);
            
        } finally {
            this.showLoading(false);
        }
    }

    setOutputText(text) {
        try {
            // ✅ FIXED ISSUE 1: Removed markScoreAsStale() call - new prompt should never be stale
            if (!this.elements.outputArea) return false;

            this.elements.outputArea.innerHTML = '';
            this.elements.outputArea.textContent = '';

            const cleanText = this.cleanTextForDOM(text);
            this.elements.outputArea.textContent = cleanText;

            // STORE FOR RANKING
            window.lastGeneratedPrompt = cleanText;

            // DISPATCH EVENT
            document.dispatchEvent(new CustomEvent('promptGenerated', {
                detail: { result: cleanText }
            }));

            // UI refresh
            this.elements.outputArea.style.display = 'none';
            this.elements.outputArea.offsetHeight;
            this.elements.outputArea.style.display = '';

            requestAnimationFrame(() => {
                this.elements.outputArea.scrollTop = this.elements.outputArea.scrollHeight;
            });

            console.log('📢 promptGenerated dispatched:', cleanText.length, 'chars');
            return true;

        } catch (e) {
            console.error('Display failed:', e);
            if (this.elements.outputArea) {
                this.elements.outputArea.textContent = text.slice(0, 500);
            }
            return false;
        }
    }
    
    cleanTextForDOM(text) {
        if (!text || typeof text !== 'string') return '';

        return text
            .replace(/\r\n/g, '\n')
            .replace(/[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\uFEFF]/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
        
    async tryFallbackModels(inputText) {
        const fallbackModels = ['gpt-4o-mini'];
        let fallbackSuccess = false;
        
        for (const fallbackModel of fallbackModels) {
            try {
                console.log(`Trying fallback model: ${fallbackModel}`);
                this.showNotification(`Trying ${fallbackModel}...`, 'info');
                
                const fallbackResult = await this.promptGenerator.generatePrompt(inputText, {
                    model: fallbackModel,
                    style: 'detailed',
                    temperature: 0.4,
                    timeout: 20000
                });
                
                if (fallbackResult.success && fallbackResult.prompt && fallbackResult.prompt.length > 50) {
                    this.state.lastPromptScore = null;
                    
                    const success = this.setOutputText(fallbackResult.prompt);
                    
                    if (!success) {
                        console.warn(`Failed to display prompt from ${fallbackModel}`);
                        continue;
                    }
                    
                    this.state.originalPrompt = fallbackResult.prompt;
                    this.state.hasGeneratedPrompt = true;
                    this.state.generatedFromInput = inputText;
                    
                    if (this.elements.stickyPrepareBtn) {
                        this.elements.stickyPrepareBtn.style.display = 'none';
                    }
                    if (this.elements.stickyResetBtn) {
                        this.elements.stickyResetBtn.style.display = 'flex';
                    }
                    
                    if (this.elements.outputSection) {
                        this.elements.outputSection.classList.add('visible');
                    }
                    
                    if (this.elements.platformsGrid && this.elements.platformsEmptyState) {
                        this.platformIntegrations.renderPlatforms(this.elements.platformsGrid);
                    }
                    
                    this.updateProgress();
                    this.updateButtonStates();
                    
                    if (fallbackResult.suggestions) {
                        this.showSuggestions(fallbackResult.suggestions);
                    }
                    
                    this.saveToHistory(inputText, fallbackResult.prompt, fallbackModel);
                    this.state.currentModel = fallbackModel;
                    this.updateModelDisplay();
                    
                    this.showNotification(`Generated with ${fallbackModel}`, 'success');
                    fallbackSuccess = true;
                    break;
                }
            } catch (fallbackError) {
                console.warn(`Fallback ${fallbackModel} failed:`, fallbackError.message);
                continue;
            }
        }
        
        if (!fallbackSuccess) {
            console.log('All AI models failed, using local generation');
            this.useLocalGeneration(inputText);
        }
    }

    useLocalGeneration(inputText) {
        try {
            this.showNotification('Using local generation...', 'info');
            
            this.state.lastPromptScore = null;
            
            const localPrompt = `Based on your request: "${inputText.substring(0, 100)}..."

I'll help you create a comprehensive prompt. Here's a structured approach:

1. **Define the role**: Expert assistant specialized in the relevant domain
2. **Set clear objectives**: Address the specific requirements mentioned
3. **Provide context**: Consider relevant background information
4. **Give step-by-step instructions**: Break down complex tasks
5. **Include examples**: Show expected output format
6. **Specify constraints**: Mention any limitations or requirements
7. **Define success criteria**: How to know when the task is complete

This structured approach ensures you get detailed, actionable responses tailored to your needs.`;
            
            const success = this.setOutputText(localPrompt);
            
            if (!success) {
                throw new Error('Failed to display local prompt');
            }
            
            this.state.originalPrompt = localPrompt;
            this.state.hasGeneratedPrompt = true;
            this.state.generatedFromInput = inputText;
            
            if (this.elements.stickyPrepareBtn) {
                this.elements.stickyPrepareBtn.style.display = 'none';
            }
            if (this.elements.stickyResetBtn) {
                this.elements.stickyResetBtn.style.display = 'flex';
            }
            
            if (this.elements.outputSection) {
                this.elements.outputSection.classList.add('visible');
            }
            
            if (this.elements.platformsGrid && this.elements.platformsEmptyState) {
                this.platformIntegrations.renderPlatforms(this.elements.platformsGrid);
            }
            
            this.updateProgress();
            this.updateButtonStates();
            this.saveToHistory(inputText, localPrompt, 'local');
            
            this.showNotification('Generated locally', 'warning');
            console.log('Local generation successful');
            
        } catch (error) {
            console.error('Local generation failed:', error);
            this.showNotification('Could not generate prompt. Please try again.', 'error');
        }
    }

    getModelDisplayName(modelId) {
        const modelNames = {
            'gemini-3-flash-preview': 'Gemini 3 Flash',
            'gpt-4o-mini': 'GPT-4o Mini',
            'llama-3.1-8b-instant': 'Llama 3.1 8B',
            'local': 'Local Generation',
            'local-fallback': 'Local Fallback'
        };
        return modelNames[modelId] || modelId;
    }

    // ======================
    // AUTO-SCORE AFTER GENERATION (FIXED)
    // ======================
    async autoScorePromptIfEnabled(force = false) {
        // Prevent double API calls
        if (this._scoreInFlight) return;
        
        if (!this.state.settings.autoScoreEnabled && !force) return;
        if (!this.state.hasGeneratedPrompt && !force) return;
        if (this.state.promptModified && !force) return;
        
        const outputArea = document.getElementById('outputArea');
        const prompt = outputArea?.textContent?.trim();
        
        if (!prompt || prompt.length < 50) return;
        
        this._scoreInFlight = true;
        
        try {
            console.log('🔍 Auto-scoring prompt...');
            
            const scoreData = await scorePromptViaWorker(prompt);
            
            // Store score for later display
            this.state.lastPromptScore = scoreData;
            this.state.promptModified = false;
            this.renderPromptScore(scoreData);
            
            // Show subtle notification
            const notificationText = scoreData.isMockData 
                ? `📊 Prompt scored: ${scoreData.grade} (local analysis)` 
                : `📊 Prompt scored: ${scoreData.grade} (${scoreData.totalScore}/50)`;
            
            this.showNotification(notificationText, 'success', 3000);
            
            // Update UI with score badge if button exists
            if (this.elements.metricsBtn) {
                this.elements.metricsBtn.innerHTML = `<i class="fas fa-chart-line"></i> ${scoreData.totalScore}/50`;
                this.elements.metricsBtn.title = `Score: ${scoreData.grade} (${scoreData.totalScore}/50) — Click for details`;
                this.elements.metricsBtn.classList.add('has-score');
            }
            
        } catch (err) {
            console.warn('⚠️ Auto-scoring failed:', err);
            // Silent fail - don't bother user
        } finally {
            this._scoreInFlight = false;
        }
    }

    // ======================
    // PROMPT SCORE PANEL (SINGLE SOURCE)
    // ======================

    renderPromptScore(score) {
        this.initPromptScorePanel();

        const panel = document.getElementById('promptScorePanel');
      const body = panel.querySelector('#promptScoreBody');

       const title = panel.querySelector('#promptScoreTitle');


        this.state.lastPromptScore = score;
        this.state.promptModified = false;

        title.textContent = `Prompt Score · ${score.grade} (${score.totalScore}/50)`;

        const bars = [
            { label: 'Clarity & Intent', value: score.clarityAndIntent, max: 20 },
            { label: 'Structure', value: score.structure, max: 15 },
            { label: 'Context & Role', value: score.contextAndRole, max: 15 }
        ];

        body.innerHTML = `
            <div class="score-bars">
                ${bars.map(b => `
                    <div class="score-bar-row">
                        <div class="score-bar-label">
                            ${b.label}
                            <span>${b.value}/${b.max}</span>
                        </div>
                        <div class="score-bar-track">
                            <div class="score-bar-fill"
                                 style="width:${(b.value / b.max) * 100}%">
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${this.renderScoreList('Strengths', score.originalJavaData?.strengths)}
            ${this.renderScoreList('Improvements', score.originalJavaData?.improvements)}

            <div class="score-meta">
                Prompt length: ${score.promptLength} chars · Words: ${score.promptWords}
            </div>
        `;

if (!panel.classList.contains('expanded')) {
    this.expandScorePanel();
}

        document.dispatchEvent(new Event('promptScoreRendered'));
    }

    renderScoreList(title, items = []) {
        if (!items || !items.length) return '';
        return `
            <div class="score-list">
                <div class="score-list-title">${title}</div>
                ${items.map(i => `<span class="score-chip">${i}</span>`).join('')}
            </div>
        `;
    }

    initPromptScorePanel() {
        const outputCard = document.getElementById('outputCard');
        if (!outputCard || document.getElementById('promptScorePanel')) return;

        const panel = document.createElement('div');
        panel.id = 'promptScorePanel';
        panel.className = 'score-panel collapsed';

        panel.innerHTML = `
            <div class="score-panel-header">
                <span class="score-panel-title">Check Prompt Score</span>
                <button class="score-panel-close">×</button>
            </div>
            <div class="score-panel-body"></div>
        `;

        outputCard.appendChild(panel);

panel.querySelector('.score-panel-header').addEventListener('click', (e) => {
    if (e.target.classList.contains('score-panel-close')) return;

    if (
        (!this.state.lastPromptScore || this.state.promptModified) &&
        !this._scoreInFlight
    ) {
        this.autoScorePromptIfEnabled(true);
    }

if (!panel.classList.contains('expanded')) {
    this.expandScorePanel();
}

});


        panel.querySelector('.score-panel-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.collapseScorePanel();
        });
    }

    expandScorePanel() {
        const panel = document.getElementById('promptScorePanel');
        if (!panel) return;
        panel.classList.add('expanded');
        panel.classList.remove('collapsed');
    }

    collapseScorePanel() {
        const panel = document.getElementById('promptScorePanel');
        if (!panel) return;
        panel.classList.remove('expanded');
        panel.classList.add('collapsed');
    }

    markScoreAsStale() {
        const panel = document.getElementById('promptScorePanel');
        if (!panel) return;

        const title = panel.querySelector('.score-panel-title');
        if (title) title.textContent = 'Prompt Changed · Re-Score';

        this.state.lastPromptScore = null;
        panel.classList.remove('expanded');
        panel.classList.add('collapsed');
    }

    // ======================
    // PLATFORM INTEGRATION - SAFE LAUNCH
    // ======================

    async handlePlatformClick(platformId) {
        if (!this.elements.outputArea) return;
        
        const prompt = this.elements.outputArea.textContent.trim();
        
        if (!prompt || prompt === this.elements.outputArea.dataset.placeholder) {
            this.showNotification('Please generate a prompt first', 'error');
            return;
        }
        
        try {
            const result = await this.platformIntegrations.copyAndLaunch(platformId, prompt);
            
            if (result.success) {
                this.showNotification(result.copyMessage, 'success');
                this.state.selectedPlatform = platformId;
                this.updateProgress();
                this.updatePlatformSelection();
            } else {
                this.showNotification('Failed to copy prompt', 'error');
            }
            
        } catch (error) {
            console.error('Platform launch error:', error);
            this.showNotification('Failed to launch platform', 'error');
        }
    }

    updatePlatformSelection() {
        document.querySelectorAll('.platform-card').forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.platform === this.state.selectedPlatform) {
                card.classList.add('selected');
            }
        });
    }

    // ======================
    // PROMPT ACTIONS
    // ======================

    async copyPrompt() {
        if (!this.elements.outputArea) return;
        
        const text = this.elements.outputArea.textContent.trim();
        
        if (!text || text === this.elements.outputArea.dataset.placeholder) {
            this.showNotification('No prompt to copy', 'error');
            return;
        }
        
        try {
            const copyText = `=== COPY AND PASTE BELOW INTO YOUR AI TOOL ===

${text}

=== IMPORTANT INSTRUCTIONS ===
1. Paste this EXACTLY as shown
2. Do NOT ask the AI to improve, modify, or analyze this prompt
3. Let the AI execute the task directly
4. If the AI asks to improve it, respond with: "Execute the task as written"
5. The prompt is already optimized and ready for execution
==============================`;
            
            await navigator.clipboard.writeText(copyText);
            this.showNotification('✅ Prompt copied with execution instructions!', 'success');
            
            if (this.elements.copyBtn) {
                this.elements.copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    if (this.elements.copyBtn) {
                        this.elements.copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    }
                }, 2000);
            }
            
        } catch (err) {
            console.error('Copy failed:', err);
            
            // Fallback: Try without instructions
            try {
                await navigator.clipboard.writeText(text);
                this.showNotification('Prompt copied (basic)', 'info');
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                
                // Last resort: Show prompt for manual copy
                this.showNotification(`Copy failed. Here's your prompt to copy manually: ${text.substring(0, 100)}...`, 'error', 5000);
            }
        }
    }

    toggleSpeech() {
        if (!this.elements.outputArea) return;
        
        const text = this.elements.outputArea.textContent.trim();
        
        if (!text || text === this.elements.outputArea.dataset.placeholder) {
            this.showNotification('No prompt to read', 'error');
            return;
        }
        
        this.voiceHandler.toggleSpeaking(text, {
            lang: this.state.settings.voiceOutputLanguage || 'en-US'
        });
    }

    toggleVoiceInput() {
        this.voiceHandler.toggleListening(this.state.settings.voiceInputLanguage || 'en-US');
    }

    exportPrompt() {
        if (!this.elements.outputArea) return;
        
        const prompt = this.elements.outputArea.textContent.trim();
        
        if (!prompt || prompt === this.elements.outputArea.dataset.placeholder) {
            this.showNotification('No prompt to export', 'error');
            return;
        }
        
        const blob = new Blob([prompt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `prompt-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Prompt exported successfully!', 'success');
    }

    savePrompt() {
        if (!this.elements.outputArea) return;
        
        this.state.originalPrompt = this.elements.outputArea.textContent.trim();
        this.state.promptModified = false;
        this.updateButtonStates();
        this.showNotification('Prompt saved!', 'success');
    }

    // ======================
    // APPLICATION CONTROLS
    // ======================

    resetApplication() {
        // Reset button visibility
        if (this.elements.stickyPrepareBtn) {
            this.elements.stickyPrepareBtn.style.display = 'flex';
        }
        if (this.elements.stickyResetBtn) {
            this.elements.stickyResetBtn.style.display = 'none';
        }
        
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.state.generatedFromInput = null;
        this.state.lastPromptScore = null;


        
        if (this.elements.userInput) {
            this.elements.userInput.value = '';
        }
        
        this.clearGeneratedPrompt();
        this.closeHistory();
        
        this.state.selectedPlatform = null;
        this.state.hasGeneratedPrompt = false;
        
        // Restore model from settings
        if (this.state.settings.defaultModel) {
            this.state.currentModel = this.state.settings.defaultModel;
        } else {
            this.state.currentModel = 'gemini-3-flash-preview';
        }
        
        this.updateModelDisplay();
        this.updateButtonStates();
        this.updateProgress();
        
        // Clear score from metrics button
        if (this.elements.metricsBtn) {
            this.elements.metricsBtn.innerHTML = `<i class="fas fa-chart-line"></i>`;
            this.elements.metricsBtn.classList.remove('has-score');
            this.elements.metricsBtn.title = 'Score prompt';
        }
        const slot = document.getElementById('rankingExplanationSlot');
        if (slot) slot.innerHTML = '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearGeneratedPrompt() {
      const panel = document.getElementById('promptScorePanel');
if (panel) panel.remove();

        if (this.elements.outputArea) {
            this.elements.outputArea.textContent = '';
        }
        
        this.state.originalPrompt = null;
        this.state.promptModified = false;
        this.state.hasGeneratedPrompt = false;
        this.state.generatedFromInput = null;
        this.state.selectedPlatform = null;
        
        if (this.elements.outputSection) {
            this.elements.outputSection.classList.remove('visible');
        }
        
        this.updateProgress();
        this.updateButtonStates();
    }

    // ======================
    // SETTINGS MODAL
    // ======================

    openSettings() {
        console.log('Opening settings...');
        
        this.loadSettingsIntoForm();
        
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Settings modal not found!');
            this.showNotification('Settings modal not found. Please refresh the page.', 'error');
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    loadSettingsIntoForm() {
        const themeSelect = document.getElementById('themeSelect');
        const uiDensity = document.getElementById('uiDensity');
        const defaultModel = document.getElementById('defaultModel');
        const promptStyle = document.getElementById('promptStyle');
        const autoConvertDelay = document.getElementById('autoConvertDelay');
        const notificationDuration = document.getElementById('notificationDuration');
        const maxHistoryItems = document.getElementById('maxHistoryItems');
        const interfaceLanguage = document.getElementById('interfaceLanguage');
        const voiceInputLanguage = document.getElementById('voiceInputLanguage');
        const voiceOutputLanguage = document.getElementById('voiceOutputLanguage');
        const autoScoreEnabled = document.getElementById('autoScoreEnabled');
        
        if (themeSelect) themeSelect.value = this.state.settings.theme || 'dark';
        if (uiDensity) uiDensity.value = this.state.settings.uiDensity || 'comfortable';
        if (defaultModel) defaultModel.value = this.state.settings.defaultModel || 'gemini-3-flash-preview';
        if (promptStyle) promptStyle.value = this.state.settings.promptStyle || 'detailed';
        if (autoConvertDelay) autoConvertDelay.value = this.state.settings.autoConvertDelay || 0;
        if (notificationDuration) notificationDuration.value = this.state.settings.notificationDuration || 3000;
        if (maxHistoryItems) maxHistoryItems.value = this.state.settings.maxHistoryItems || 25;
        if (interfaceLanguage) interfaceLanguage.value = this.state.settings.interfaceLanguage || 'en';
        if (voiceInputLanguage) voiceInputLanguage.value = this.state.settings.voiceInputLanguage || 'en-US';
        if (voiceOutputLanguage) voiceOutputLanguage.value = this.state.settings.voiceOutputLanguage || 'en-US';
        if (autoScoreEnabled) autoScoreEnabled.checked = this.state.settings.autoScoreEnabled || true;
        
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }

    saveSettingsModal() {
        console.log('Saving settings...');
        
        const themeSelect = document.getElementById('themeSelect');
        const uiDensity = document.getElementById('uiDensity');
        const defaultModel = document.getElementById('defaultModel');
        const promptStyle = document.getElementById('promptStyle');
        const autoConvertDelay = document.getElementById('autoConvertDelay');
        const notificationDuration = document.getElementById('notificationDuration');
        const maxHistoryItems = document.getElementById('maxHistoryItems');
        const interfaceLanguage = document.getElementById('interfaceLanguage');
        const voiceInputLanguage = document.getElementById('voiceInputLanguage');
        const voiceOutputLanguage = document.getElementById('voiceOutputLanguage');
        const autoScoreEnabled = document.getElementById('autoScoreEnabled');
        
        if (themeSelect) {
            this.state.settings.theme = themeSelect.value;
            console.log('Theme set to:', themeSelect.value);
            this.applyTheme();
        }
        
        if (uiDensity) {
            this.state.settings.uiDensity = uiDensity.value;
            console.log('UI Density set to:', uiDensity.value);
            this.applyUIDensity();
        }
        
        if (defaultModel) {
            this.state.settings.defaultModel = defaultModel.value;
            this.state.currentModel = defaultModel.value;
            console.log('Default model set to:', defaultModel.value);
            this.updateModelDisplay();
        }
        
        if (promptStyle) {
            this.state.settings.promptStyle = promptStyle.value;
            console.log('Prompt style set to:', promptStyle.value);
        }
        
        if (autoConvertDelay) {
            this.state.settings.autoConvertDelay = parseInt(autoConvertDelay.value);
            console.log('Auto-convert delay set to:', autoConvertDelay.value);
        }
        
        if (notificationDuration) {
            this.state.settings.notificationDuration = parseInt(notificationDuration.value);
            console.log('Notification duration set to:', notificationDuration.value);
        }
        
        if (maxHistoryItems) {
            this.state.settings.maxHistoryItems = parseInt(maxHistoryItems.value);
            console.log('Max history items set to:', maxHistoryItems.value);
        }
        
        if (interfaceLanguage) {
            this.state.settings.interfaceLanguage = interfaceLanguage.value;
            console.log('Interface language set to:', interfaceLanguage.value);
        }
        
        if (voiceInputLanguage) {
            this.state.settings.voiceInputLanguage = voiceInputLanguage.value;
            console.log('Voice input language set to:', voiceInputLanguage.value);
        }
        
        if (voiceOutputLanguage) {
            this.state.settings.voiceOutputLanguage = voiceOutputLanguage.value;
            console.log('Voice output language set to:', voiceOutputLanguage.value);
        }
        
        if (autoScoreEnabled) {
            this.state.settings.autoScoreEnabled = autoScoreEnabled.checked;
            console.log('Auto-score enabled:', autoScoreEnabled.checked);
        }
        
        console.log('Settings to save:', this.state.settings);
        
        const saveResult = this.saveSettings();
        console.log('Save result:', saveResult);
        
        this.closeSettings();
        
        if (saveResult) {
            this.showNotification('Settings saved successfully!', 'success');
        } else {
            this.showNotification('Failed to save settings. Please try again.', 'error');
        }
    }

    // ======================
    // FULL SCREEN EDITOR
    // ======================

    openFullScreenEditor(type) {
        console.log('Opening full screen editor for:', type);
        
        this.state.isEditorOpen = true;
        this.state.currentEditor = type;
        
        const editor = document.getElementById('fullScreenEditor');
        const editorTextarea = document.getElementById('editorTextarea');
        const editorTitle = document.getElementById('editorTitle');
        const closeEditorBtn = document.getElementById('closeEditorBtn');
        
        if (!editor || !editorTextarea || !closeEditorBtn) {
            console.error('Full screen editor elements not found!');
            this.showNotification('Editor not available. Please refresh the page.', 'error');
            return;
        }
        
        let text = '';
        if (type === 'input') {
            text = this.elements.userInput ? this.elements.userInput.value : '';
            if (editorTitle) editorTitle.textContent = 'Edit Input';
        } else {
            text = this.elements.outputArea ? this.elements.outputArea.textContent : '';
            if (editorTitle) editorTitle.textContent = 'Edit Output';
        }
        
        editorTextarea.value = text;
        editor.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            editorTextarea.focus();
            editorTextarea.setSelectionRange(text.length, text.length);
        }, 100);
        
        this.setupEditorEvents();
    }

    setupEditorEvents() {
        const editorTextarea = document.getElementById('editorTextarea');
        const closeEditorBtn = document.getElementById('closeEditorBtn');
        
        if (!editorTextarea || !closeEditorBtn) return;
        
        const editorPrepareBtn = document.getElementById('editorPrepareBtn');
        const editorMicBtn = document.getElementById('editorMicBtn');
        
        if (editorPrepareBtn) {
            editorPrepareBtn.onclick = () => this.prepareFromEditor();
            editorTextarea.addEventListener('input', () => {
                editorPrepareBtn.disabled = !editorTextarea.value.trim();
            });
        }
        
        closeEditorBtn.onclick = () => this.closeFullScreenEditor();
        
        if (editorMicBtn) {
            editorMicBtn.onclick = () => {
                this.voiceHandler.toggleListening(this.state.settings.voiceInputLanguage || 'en-US');
            };
        }
    
        editorTextarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.state.currentEditor === 'input' && editorPrepareBtn && !editorPrepareBtn.disabled) {
                    this.prepareFromEditor();
                }
            }
            
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeFullScreenEditor();
            }
        });
    }

    async prepareFromEditor() {
        const editorTextarea = document.getElementById('editorTextarea');
        if (!editorTextarea) return;
        
        const inputText = editorTextarea.value.trim();
        
        if (!inputText) {
            this.showNotification('Please describe your task first', 'error');
            return;
        }
        
        if (this.elements.userInput) {
            this.elements.userInput.value = inputText;
            this.handleInputChange();
        }
        
        this.closeFullScreenEditor();
        await this.preparePrompt();
    }

    closeFullScreenEditor() {
        const editor = document.getElementById('fullScreenEditor');
        const editorTextarea = document.getElementById('editorTextarea');
        
        if (editor && editorTextarea) {
            if (this.state.currentEditor === 'output' && this.elements.outputArea) {
                const newText = editorTextarea.value;
                this.elements.outputArea.textContent = newText;
                // ✅ FIXED ISSUE 4: Consolidated - handle edit through handlePromptEdit
                this.handlePromptEdit();
            }
            
            editor.classList.remove('active');
            document.body.style.overflow = '';
            this.state.isEditorOpen = false;
            this.state.currentEditor = null;
        }
    }

    // ======================
    // UI CONTROLS
    // ======================

    toggleInspirationPanel() {
        if (this.state.inspirationPanelOpen) {
            this.closeInspirationPanel();
        } else {
            this.openInspirationPanel();
        }
    }

    openInspirationPanel() {
        this.state.inspirationPanelOpen = true;
        if (this.elements.inspirationPanel) {
            this.elements.inspirationPanel.classList.add('expanded');
        }
        if (this.elements.needInspirationBtn) {
            this.elements.needInspirationBtn.innerHTML = '<i class="fas fa-lightbulb"></i> ';
        }
    }

    closeInspirationPanel() {
        this.state.inspirationPanelOpen = false;
        if (this.elements.inspirationPanel) {
            this.elements.inspirationPanel.classList.remove('expanded');
        }
        if (this.elements.needInspirationBtn) {
            this.elements.needInspirationBtn.innerHTML = '<i class="fas fa-lightbulb"></i>';
        }
    }

    insertExample(type) {
        const examples = {
            email: `Compose a professional follow-up email to a client who attended our product demo last week. The email should:
1. Thank them for their time
2. Highlight 2-3 key features relevant to their business needs
3. Include a clear call-to-action for next steps
4. Maintain a warm but professional tone
5. Be concise (under 200 words)`,
            
            code: `Write a Python function that:
- Accepts a list of numbers
- Returns a dictionary with the minimum, maximum, average, and median values
- Handles empty lists gracefully
- Has clear docstring documentation
- Includes type hints for better code readability`,
            
            creative: `Write a short story (500-750 words) about a time traveler who accidentally brings a smartphone to medieval times. The story should:
- Explore the cultural clash between technology and medieval society
- Include humor but also moments of genuine connection
- Feature at least one character who sees the potential in this "magic"
- End with an open-ended but satisfying conclusion
- Use vivid sensory details to bring both eras to life`,
            
            social: `Create a LinkedIn post announcing our company's new sustainability initiative. The post should:
- Be professional yet approachable
- Highlight the environmental impact
- Include relevant hashtags
- Encourage engagement from followers
- Be under 250 words
- Include a call-to-action for comments and shares`,
            
            analysis: `Analyze the given dataset and provide insights by:
1. Identifying key trends and patterns
2. Detecting anomalies or outliers
3. Providing actionable recommendations
4. Visualizing findings where appropriate
5. Considering business context and implications

Focus on practical insights that drive decision-making.`,
            
            research: `Summarize the research paper/article by:
1. Explaining the research question and objectives
2. Describing methodology and data sources
3. Presenting key findings and results
4. Discussing limitations and implications
5. Suggesting areas for future research

Keep the summary concise yet comprehensive.`,
            
            strategy: `Develop a comprehensive business strategy for an organization. The strategy should:
1. Define vision, mission, and long-term objectives
2. Analyze market, customers, and competitors
3. Identify value propositions and differentiators
4. Outline growth and expansion plans
5. Address financial and operational considerations
6. Highlight risks and mitigation strategies
7. Provide clear, actionable recommendations`
        };
        
        const example = examples[type] || '';
        if (example && this.elements.userInput) {
            this.elements.userInput.value = example;
            this.handleInputChange();
            this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} example inserted!`, 'success');
        } else {
            this.showNotification('Example not available', 'warning');
        }
    }

    toggleHistory() {
        if (!this.elements.historySection) return;
        
        if (this.elements.historySection.classList.contains('active')) {
            this.closeHistory();
        } else {
            this.openHistory();
        }
    }

    openHistory() {
        if (this.elements.historySection) {
            this.elements.historySection.classList.add('active');
        }
        if (this.elements.historyBtn) {
            this.elements.historyBtn.innerHTML = '<i class="fas fa-history"></i> ';
        }
        this.loadHistory();
    }

    closeHistory() {
        if (this.elements.historySection) {
            this.elements.historySection.classList.remove('active');
        }
        if (this.elements.historyBtn) {
            this.elements.historyBtn.innerHTML = '<i class="fas fa-history"></i>';
        }
    }

    // ======================
    // UI UPDATES & UTILITIES
    // ======================

    showLoading(isLoading) {
        if (!this.elements.stickyPrepareBtn) return;
        
        if (isLoading) {
            this.elements.stickyPrepareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
            this.elements.stickyPrepareBtn.disabled = true;
        } else {
            this.elements.stickyPrepareBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Prepare Prompt';
            this.elements.stickyPrepareBtn.disabled = !this.elements.userInput || !this.elements.userInput.value.trim();
        }
    }

    updateButtonStates() {
        const hasInput = this.elements.userInput && this.elements.userInput.value.trim().length > 0;
        const hasPrompt = this.elements.outputArea && this.elements.outputArea.textContent.trim().length > 0;
        const isModified = this.state.promptModified;
        
        // Sticky prepare button
        if (this.elements.stickyPrepareBtn) {
            this.elements.stickyPrepareBtn.disabled = !hasInput;
        }
        
        // Save prompt button
        if (this.elements.savePromptBtn) {
            this.elements.savePromptBtn.disabled = !hasPrompt || !isModified;
        }
        
        const canUsePrompt = hasPrompt && this.state.hasGeneratedPrompt;
        
        // Copy, speak, export buttons
        if (this.elements.copyBtn) {
            this.elements.copyBtn.disabled = !canUsePrompt;
        }
        
        if (this.elements.speakBtn) {
            this.elements.speakBtn.disabled = !canUsePrompt;
        }
        
        if (this.elements.exportBtn) {
            this.elements.exportBtn.disabled = !canUsePrompt;
        }
        
        // Platforms visibility
        if (this.elements.platformsGrid && this.elements.platformsEmptyState) {
            if (canUsePrompt) {
                this.elements.platformsGrid.style.display = 'grid';
                this.elements.platformsEmptyState.style.display = 'none';
            } else {
                this.elements.platformsGrid.style.display = 'none';
                this.elements.platformsEmptyState.style.display = 'flex';
            }
        }
        
        // Show/hide clear button
        if (this.elements.clearInputBtn) {
            this.elements.clearInputBtn.style.display = hasInput ? 'flex' : 'none';
        }
    }

    updateProgress() {
        if (!this.elements.progressFill) return;
        
        let progress = 0;
        
        if (this.elements.userInput && this.elements.userInput.value.trim().length > 0) {
            progress += 25;
        }
        
        if (this.state.hasGeneratedPrompt) {
            progress += 50;
        }
        
        if (this.state.selectedPlatform) {
            progress += 25;
        }
        
        this.elements.progressFill.style.width = `${progress}%`;
    }

    updateModelDisplay() {
        if (this.elements.currentModel) {
            const modelName = this.getModelDisplayName(this.state.currentModel);
            this.elements.currentModel.textContent = modelName;
        }
    }

    // ======================
    // HISTORY MANAGEMENT
    // ======================

    loadHistory() {
        const history = this.storageManager.load('promptHistory') || [];
        this.state.promptHistory = history;
        this.renderHistory();
    }

    saveToHistory(inputText, promptText, model) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            input: inputText.substring(0, 100) + (inputText.length > 100 ? '...' : ''),
            prompt: promptText.substring(0, 150) + (promptText.length > 150 ? '...' : ''),
            model: model,
            fullInput: inputText,
            fullPrompt: promptText
        };
        
        this.state.promptHistory.unshift(historyItem);
        
        const maxItems = this.state.settings.maxHistoryItems || 25;
        if (this.state.promptHistory.length > maxItems) {
            this.state.promptHistory = this.state.promptHistory.slice(0, maxItems);
        }
        
        this.storageManager.save('promptHistory', this.state.promptHistory);
        this.renderHistory();
    }

    renderHistory() {
        const historyList = this.elements.historyList;
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        if (this.state.promptHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>No history yet</p>
                </div>
            `;
            return;
        }
        
        this.state.promptHistory.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-item-content">
                    <div class="history-item-header">
                        <span class="history-item-time">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="history-item-model">${this.getModelDisplayName(item.model)}</span>
                    </div>
                    <div class="history-item-input">${this.escapeHTML(item.input)}</div>
                    <div class="history-item-prompt">${this.escapeHTML(item.prompt)}</div>
                </div>
                <button class="history-item-restore" data-id="${item.id}">
                    <i class="fas fa-redo"></i>
                </button>
            `;
            
            li.querySelector('.history-item-restore').addEventListener('click', (e) => {
                e.stopPropagation();
                this.restoreHistoryItem(item.id);
            });
            
            li.addEventListener('click', () => {
                this.viewHistoryItem(item.id);
            });
            
            historyList.appendChild(li);
        });
    }

    restoreHistoryItem(id) {
        const item = this.state.promptHistory.find(h => h.id === id);
        if (!item) return;

        this.clearGeneratedPrompt();

        if (this.elements.userInput) {
            this.elements.userInput.value = item.fullInput;
            this.handleInputChange();
        }

        if (this.state.isEditorOpen && this.state.currentEditor === 'input') {
            const editorTextarea = document.getElementById('editorTextarea');
            const editorPrepareBtn = document.getElementById('editorPrepareBtn');

            if (editorTextarea) editorTextarea.value = item.fullInput;
            if (editorPrepareBtn) editorPrepareBtn.disabled = false;
        }

        this.closeHistory();
    }

    viewHistoryItem(id) {
        const item = this.state.promptHistory.find(h => h.id === id);
        if (!item) return;
        this.clearGeneratedPrompt();

        if (this.elements.userInput) {
            this.elements.userInput.value = item.fullInput;
            this.handleInputChange();
            this.updateButtonStates();
        }

        this.openFullScreenEditor('input');

        setTimeout(() => {
            const editorTextarea = document.getElementById('editorTextarea');
            const editorPrepareBtn = document.getElementById('editorPrepareBtn');

            if (editorTextarea) {
                editorTextarea.value = item.fullInput;
            }

            if (editorPrepareBtn) {
                editorPrepareBtn.disabled = false;
            }
        }, 0);

        this.closeHistory();
    }

    // ======================
    // SETTINGS MANAGEMENT
    // ======================

    loadSettings() {
        const saved = this.storageManager.load('appSettings');
        if (saved) {
            this.state.settings = { ...this.loadDefaultSettings(), ...saved };
        }
        
        if (this.state.settings.defaultModel) {
            this.state.currentModel = this.state.settings.defaultModel;
        }
        
        this.applyTheme();
        this.applyUIDensity();
    }

    saveSettings() {
        try {
            this.storageManager.save('appSettings', this.state.settings);
            this.state.settingsModified = false;
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    applyTheme() {
        const theme = this.state.settings.theme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        if (this.elements.currentTheme) {
            this.elements.currentTheme.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        }
    }

    applyUIDensity() {
        const density = this.state.settings.uiDensity || 'comfortable';
        document.documentElement.setAttribute('data-density', density);
    }

    // ======================
    // NOTIFICATIONS
    // ======================

    showNotification(message, type = 'info', duration = null) {
        if (!this.elements.notificationContainer) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${this.escapeHTML(message)}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.elements.notificationContainer.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        const finalDuration = duration || this.state.settings.notificationDuration || 3000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, finalDuration);
        
        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ======================
    // SUGGESTIONS
    // ======================

    showSuggestions(suggestions) {
        if (!this.elements.suggestionsList || !this.elements.suggestionsPanel) return;
        
        this.elements.suggestionsList.innerHTML = '';
        
        if (!suggestions || suggestions.length === 0) {
            this.elements.suggestionsPanel.style.display = 'none';
            return;
        }
        
        suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.textContent = suggestion;
            li.addEventListener('click', () => {
                this.applySuggestion(suggestion);
            });
            this.elements.suggestionsList.appendChild(li);
        });
        
        this.elements.suggestionsPanel.style.display = 'block';
    }

    applySuggestion(suggestion) {
        if (!this.elements.userInput) return;
        
        const currentInput = this.elements.userInput.value;
        this.elements.userInput.value = currentInput + ' ' + suggestion;
        this.handleInputChange();
        
        this.showNotification('Suggestion applied to input', 'info');
    }

    // ======================
    // UTILITY METHODS
    // ======================

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async testWorkerConnection() {
        try {
            console.log('Testing worker connection...');
            const testResult = await this.promptGenerator.testConnection();
            console.log('Worker test result:', testResult);
            
            if (testResult.success) {
                this.showNotification('Connected to AI services', 'success');
            } else {
                console.warn('Worker test failed:', testResult.error);
            }
        } catch (error) {
            console.warn('Worker test failed:', error);
        }
    }

    handleKeyboardShortcuts(e) {
        const tag = e.target.tagName?.toLowerCase();

        const isTyping =
            tag === 'input' ||
            tag === 'textarea' ||
            e.target.isContentEditable;

        /* =========================
           ALT + P → Prepare Prompt
           ========================= */
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();

            if (this.elements.stickyPrepareBtn && !this.elements.stickyPrepareBtn.disabled) {
                this.preparePrompt();
                this.showNotification('⚡ Prepare Prompt (Alt + P)', 'info');
            }
            return;
        }

        // Block other shortcuts while typing (except Alt-based actions)
        if (isTyping && !e.altKey) return;

        /* =========================
           Ctrl / Cmd + Enter
           ========================= */
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (this.elements.stickyPrepareBtn && !this.elements.stickyPrepareBtn.disabled) {
                this.preparePrompt();
            }
        }

        /* =========================
           ALT + T → Open AI Tool
           ========================= */
        if (e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault();

            const toolBtn =
                document.querySelector('.platform-card.selected') ||
                document.querySelector('.platform-card');

            if (toolBtn) {
                toolBtn.click();
                toolBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.showNotification('🚀 AI Tool opened (Alt + T)', 'info');
            } else {
                this.showNotification('Generate a prompt first', 'warning');
            }
            return;
        }

        /* =========================
           ESC key handling
           ========================= */
        if (e.key === 'Escape') {
            if (this.state.isEditorOpen) this.closeFullScreenEditor();
            if (this.state.inspirationPanelOpen) this.closeInspirationPanel();
            if (this.elements.historySection?.classList.contains('active')) {
                this.closeHistory();
            }
        }
    }

    updateUI() {
        this.updateButtonStates();
        this.updateProgress();
        this.updateModelDisplay();
    }
}

// ======================
// GRADE COLOR HELPER
// ======================
function getGradeColor(grade) {
    const colors = {
        'Excellent': '#10b981',
        'Very Good': '#3b82f6',
        'Good': '#8b5cf6',
        'Fair': '#f59e0b',
        'Poor': '#ef4444',
        'Inadequate': '#6b7280'
    };
    return colors[grade] || '#6b7280';
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.promptCraftApp = new PromptCraftApp();
});
