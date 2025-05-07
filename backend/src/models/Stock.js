const db = require('../utils/db');

class Stock {
    // Get all stocks
    static getAll() {
        return db.prepare('SELECT * FROM stocks').all();
    }

    // Get a stock by ID
    static getById(id) {
        return db.prepare('SELECT * FROM stocks WHERE id = ?').get(id);
    }

    // Create a new stock
    static create(stock) {
        const { name, icon_url, color, volatility, base_value, buff_value } = stock;

        const stmt = db.prepare(`
      INSERT INTO stocks (name, icon_url, color, volatility, base_value, current_price, buff_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(name, icon_url, color, volatility, base_value, base_value, buff_value || 0);

        if (result.lastInsertRowid) {
            // Add initial price to stock history
            const historyStmt = db.prepare(`
        INSERT INTO stock_history (stock_id, price) VALUES (?, ?)
      `);
            historyStmt.run(result.lastInsertRowid, base_value);
        }

        return result.lastInsertRowid;
    }

    // Update a stock
    static update(id, stock) {
        const { name, icon_url, color, volatility, buff_value } = stock;

        const stmt = db.prepare(`
      UPDATE stocks 
      SET name = ?, icon_url = ?, color = ?, volatility = ?, buff_value = ?
      WHERE id = ?
    `);

        return stmt.run(name, icon_url, color, volatility, buff_value || 0, id);
    }

    // Delete a stock
    static delete(id) {
        return db.prepare('DELETE FROM stocks WHERE id = ?').run(id);
    }

    // Update stock price
    static updatePrice(id, newPrice) {
        const stmt = db.prepare(`
      UPDATE stocks SET current_price = ? WHERE id = ?
    `);

        const result = stmt.run(newPrice, id);

        if (result.changes > 0) {
            // Add to price history
            const historyStmt = db.prepare(`
        INSERT INTO stock_history (stock_id, price) VALUES (?, ?)
      `);
            historyStmt.run(id, newPrice);
        }

        return result;
    }

    // Get price history for a stock
    static getPriceHistory(id, limit = 100, granularity = 1) {
        if (granularity <= 1) {
            // If granularity is 1 or less, return all points up to the limit
            return db.prepare(`
                SELECT price, timestamp 
                FROM stock_history 
                WHERE stock_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `).all(id, limit);
        } else {
            // Use ROW_NUMBER() to get every nth row
            return db.prepare(`
                WITH numbered AS (
                    SELECT 
                        price, 
                        timestamp,
                        ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY timestamp DESC) as row_num
                    FROM stock_history
                    WHERE stock_id = ?
                )
                SELECT price, timestamp
                FROM numbered
                WHERE row_num % ? = 1
                LIMIT ?
            `).all(id, granularity, limit);
        }
    }
}

module.exports = Stock;