const db = require('./db');

// Create tables if they don't exist
function setupDatabase() {
    // Stocks table
    db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon_url TEXT,
      color TEXT DEFAULT '#666666',
      volatility TEXT CHECK(volatility IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
      base_value REAL NOT NULL,
      current_price REAL NOT NULL,
      buff_value REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Positions table
    db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      open_price REAL NOT NULL,
      close_price REAL,
      is_open BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP,
      FOREIGN KEY (stock_id) REFERENCES stocks (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

    // Stock price history table
    db.exec(`
    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id INTEGER NOT NULL,
      price REAL NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stock_id) REFERENCES stocks (id)
    );
  `);

    // Game settings table
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );
  `);

    // Insert default settings if they don't exist
    const settingsStmt = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
    const settings = [
        ['simulation_interval', '5000'],   // milliseconds between price updates
        ['simulation_active', 'false'],    // whether the simulation is currently running
        ['demand_impact_weight', '0.1'],   // how much demand affects price
        ['random_event_chance', '0.05'],   // probability of random events
        ['random_event_impact', '0.1']     // maximum impact of random events
    ];

    settings.forEach(setting => settingsStmt.run(setting[0], setting[1]));

    console.log('Database setup complete!');
}

// Run setup
setupDatabase();

module.exports = { setupDatabase };