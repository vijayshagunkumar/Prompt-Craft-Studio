// Storage Manager for PromptCraft Pro
class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            SETTINGS: 'promptCraftSettings',
            HISTORY: 'promptCraftHistory',
            TEMPLATES: 'promptCraftTemplates',
            SHORTCUTS: 'promptCraftShortcuts'
        };
    }

    // Save data to localStorage
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Failed to save data for key ${key}:`, e);
            return false;
        }
    }

    // Load data from localStorage
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Failed to load data for key ${key}:`, e);
            return defaultValue;
        }
    }

    // Clear specific data
    clear(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Failed to clear data for key ${key}:`, e);
            return false;
        }
    }

    // Clear all app data
    clearAll() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Failed to clear all data:', e);
            return false;
        }
    }

    // Export data as JSON
    exportData() {
        const data = {};
        Object.values(this.STORAGE_KEYS).forEach(key => {
            data[key] = this.load(key);
        });
        return JSON.stringify(data, null, 2);
    }

    // Import data from JSON
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            Object.entries(data).forEach(([key, value]) => {
                this.save(key, value);
            });
            return true;
        } catch (e) {
            console.error('Failed to import data:', e);
            return false;
        }
    }

    // Get storage usage
    getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2; // Approximate byte size
            }
        }
        return total;
    }
}
