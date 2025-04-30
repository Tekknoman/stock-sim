const db = require('../utils/db');

class User {
    // Get all users
    static getAll() {
        return db.prepare('SELECT * FROM users').all();
    }

    // Get a user by ID
    static getById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    // Get a user by name
    static getByName(name) {
        return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
    }

    // Create a new user
    static create(user) {
        const { name, icon_url } = user;
        const stmt = db.prepare('INSERT INTO users (name, icon_url) VALUES (?, ?)');
        const result = stmt.run(name, icon_url);
        return result.lastInsertRowid;
    }

    // Update a user
    static update(id, user) {
        const { name, icon_url } = user;
        const stmt = db.prepare('UPDATE users SET name = ?, icon_url = ? WHERE id = ?');
        return stmt.run(name, icon_url, id);
    }

    // Delete a user
    static delete(id) {
        return db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
}

module.exports = User;