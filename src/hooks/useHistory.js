// ============================================================
// useHistory.js - Local Storage History for operations
// ============================================================

const HISTORY_KEY = 'ghost_protocol_history';
const MAX_ENTRIES = 50;

/**
 * Get all history entries from localStorage.
 * @returns {Array} Array of history entry objects
 */
export function getHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Add a new entry to history.
 * @param {'encode'|'decode'|'scan'} action - Type of operation
 * @param {object} details - Operation details
 * @param {string} [details.message] - Message (encode only, truncated)
 * @param {string} [details.result] - Result summary
 * @param {boolean} [details.encrypted] - Whether password was used
 * @param {number} [details.scanScore] - Scan score (scan only)
 */
export function addHistoryEntry(action, details = {}) {
    const entries = getHistory();

    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        action,
        timestamp: new Date().toISOString(),
        ...details,
    };

    // Truncate message preview for privacy
    if (entry.message && entry.message.length > 50) {
        entry.message = entry.message.substring(0, 50) + '...';
    }

    entries.unshift(entry); // newest first

    // Cap at MAX_ENTRIES
    if (entries.length > MAX_ENTRIES) {
        entries.length = MAX_ENTRIES;
    }

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {
        // Storage full — clear oldest half
        entries.length = Math.floor(MAX_ENTRIES / 2);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    }

    return entry;
}

/**
 * Clear all history.
 */
export function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}
