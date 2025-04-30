const db = require('../utils/db');

class Position {
    // Get all positions
    static getAll() {
        return db.prepare(`
      SELECT 
        p.*,
        s.name as stock_name,
        s.current_price,
        u.name as user_name
      FROM positions p
      JOIN stocks s ON p.stock_id = s.id
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
    }

    // Get position by ID
    static getById(id) {
        return db.prepare(`
      SELECT 
        p.*,
        s.name as stock_name,
        s.current_price,
        u.name as user_name
      FROM positions p
      JOIN stocks s ON p.stock_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);
    }

    // Get positions for a user
    static getByUserId(userId) {
        return db.prepare(`
      SELECT 
        p.*,
        s.name as stock_name,
        s.current_price,
        u.name as user_name,
        s.color,
        CASE
          WHEN p.is_open = 1 THEN (s.current_price - p.open_price) * p.amount
          ELSE (p.close_price - p.open_price) * p.amount
        END as profit_loss
      FROM positions p
      JOIN stocks s ON p.stock_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);
    }

    // Get open positions for a stock
    static getByStockId(stockId) {
        return db.prepare(`
      SELECT 
        p.*,
        s.name as stock_name,
        s.current_price,
        u.name as user_name,
        u.icon_url as user_icon,
        (s.current_price - p.open_price) * p.amount as profit_loss,
        ((s.current_price - p.open_price) / p.open_price) * 100 as percent_change
      FROM positions p
      JOIN stocks s ON p.stock_id = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.stock_id = ? AND p.is_open = 1
      ORDER BY percent_change DESC
    `).all(stockId);
    }

    // Create a new position
    static create(position) {
        const { stock_id, user_id, amount, open_price } = position;
        const stmt = db.prepare(`
      INSERT INTO positions (stock_id, user_id, amount, open_price)
      VALUES (?, ?, ?, ?)
    `);
        const result = stmt.run(stock_id, user_id, amount, open_price);
        return result.lastInsertRowid;
    }

    // Close a position
    static close(id, closePrice) {
        const stmt = db.prepare(`
      UPDATE positions 
      SET is_open = 0, close_price = ?, closed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_open = 1
    `);
        return stmt.run(closePrice, id);
    }

    // Get total demand for a stock (sum of open positions)
    static getTotalDemandForStock(stockId) {
        return db.prepare(`
      SELECT SUM(amount) as total_demand
      FROM positions
      WHERE stock_id = ? AND is_open = 1
    `).get(stockId);
    }
    
    // Delete all positions for a stock
    static deleteByStockId(stockId) {
        const stmt = db.prepare(`
      DELETE FROM positions WHERE stock_id = ?
    `);
        return stmt.run(stockId);
    }
    
    // Delete all positions for a user
    static deleteByUserId(userId) {
        const stmt = db.prepare(`
      DELETE FROM positions WHERE user_id = ?
    `);
        return stmt.run(userId);
    }
}

module.exports = Position;