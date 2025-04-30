const User = require('../models/User');
const Position = require('../models/Position');

// Get all users
exports.getAllUsers = (req, res) => {
    try {
        const users = User.getAll();
        res.json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

// Get a user by ID
exports.getUserById = (req, res) => {
    try {
        const user = User.getById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

// Create a new user
exports.createUser = (req, res) => {
    try {
        const { name, icon_url } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Check if user name already exists
        const existingUser = User.getByName(name);
        if (existingUser) {
            return res.status(409).json({ error: 'User name already exists' });
        }

        const id = User.create({ name, icon_url });
        res.status(201).json({ id, message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update a user
exports.updateUser = (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon_url } = req.body;

        const user = User.getById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if new name already exists (if changing name)
        if (name && name !== user.name) {
            const existingUser = User.getByName(name);
            if (existingUser && existingUser.id !== parseInt(id)) {
                return res.status(409).json({ error: 'User name already exists' });
            }
        }

        User.update(id, {
            name: name || user.name,
            icon_url: icon_url || user.icon_url
        });

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Delete a user
exports.deleteUser = (req, res) => {
    try {
        const { id } = req.params;

        const user = User.getById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        User.delete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Get all positions for a user
exports.getUserPositions = (req, res) => {
    try {
        const { id } = req.params;

        const user = User.getById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const positions = Position.getByUserId(id);
        res.json(positions);
    } catch (error) {
        console.error('Error getting user positions:', error);
        res.status(500).json({ error: 'Failed to get user positions' });
    }
};