const db = require('../utils/db');

class Settings {
    // Get all settings
    static getAll() {
        const settings = {};
        const rows = db.prepare('SELECT key, value FROM settings').all();

        rows.forEach(row => {
            settings[row.key] = row.value;
        });

        return settings;
    }

    // Get a setting by key
    static get(key) {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    }

    // Update a setting
    static set(key, value) {
        const stmt = db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = ?
    `);
        return stmt.run(key, value, value);
    }

    // Update multiple settings at once
    static setMultiple(settings) {
        const stmt = db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = ?
    `);

        const tx = db.transaction((settingsObj) => {
            for (const [key, value] of Object.entries(settingsObj)) {
                stmt.run(key, value, value);
            }
        });

        return tx(settings);
    }
}

module.exports = Settings;