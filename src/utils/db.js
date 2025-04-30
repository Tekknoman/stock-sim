const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to SQLite database
const db = new Database(path.join(dataDir, 'stocksim.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;