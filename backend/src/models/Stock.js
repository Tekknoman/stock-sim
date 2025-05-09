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
        const { name, icon_url, color, volatility, base_value, buff_value, max_value } = stock;

        const stmt = db.prepare(`
      INSERT INTO stocks (name, icon_url, color, volatility, base_value, current_price, buff_value, max_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(name, icon_url, color, volatility, base_value, base_value, buff_value || 0, max_value || null);

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
        const { name, icon_url, color, volatility, buff_value, max_value } = stock;

        const stmt = db.prepare(`
      UPDATE stocks 
      SET name = ?, icon_url = ?, color = ?, volatility = ?, buff_value = ?, max_value = ?
      WHERE id = ?
    `);

        return stmt.run(name, icon_url, color, volatility, buff_value || 0, max_value || null, id);
    }

    // Manually set stock price
    static setPrice(id, price) {
        // Make sure price is a valid number and positive
        price = parseFloat(price);
        if (isNaN(price) || price <= 0) {
            throw new Error("Invalid price value");
        }

        // Round to 2 decimal places for consistency
        price = Math.round(price * 100) / 100;

        return this.updatePrice(id, price);
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

    // Record a trade for this stock
    static recordTrade(id, amount = 1) {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            UPDATE stocks 
            SET last_trade_time = ?, trade_volume = trade_volume + ?
            WHERE id = ?
        `);
        return stmt.run(now, amount, id);
    }
    
    // Get trading activity info for a stock
    static getTradingActivity(id) {
        const stock = this.getById(id);
        if (!stock) return null;
        
        return {
            lastTradeTime: stock.last_trade_time ? new Date(stock.last_trade_time) : null,
            tradeVolume: stock.trade_volume || 0
        };
    }
    
    // Reset trading volume for all stocks (e.g., for daily reset)
    static resetTradingVolumes() {
        const stmt = db.prepare(`UPDATE stocks SET trade_volume = 0`);
        return stmt.run();
    }
}

module.exports = Stock;