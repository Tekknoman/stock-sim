const Position = require('../models/Position');
const Stock = require('../models/Stock');
const User = require('../models/User');
const socketUtil = require('../utils/socket'); // Import socket.io utility

// Get all positions
exports.getAllPositions = (req, res) => {
    try {
        const positions = Position.getAll();
        res.json(positions);
    } catch (error) {
        console.error('Error getting positions:', error);
        res.status(500).json({ error: 'Failed to get positions' });
    }
};

// Get a position by ID
exports.getPositionById = (req, res) => {
    try {
        const position = Position.getById(req.params.id);
        if (!position) {
            return res.status(404).json({ error: 'Position not found' });
        }
        res.json(position);
    } catch (error) {
        console.error('Error getting position:', error);
        res.status(500).json({ error: 'Failed to get position' });
    }
};

// Create a new position
exports.createPosition = (req, res) => {
    try {
        const { stock_id, user_id, amount } = req.body;

        if (!stock_id || !user_id || !amount) {
            return res.status(400).json({ error: 'Stock ID, User ID, and amount are required' });
        }

        // Check if stock and user exist
        const stock = Stock.getById(stock_id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        const user = User.getById(user_id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a new position with current price
        const id = Position.create({
            stock_id,
            user_id,
            amount,
            open_price: stock.current_price
        });

        // Record this trade in the stock's activity
        Stock.recordTrade(stock_id, amount);

        // Get the complete position object with all details
        const position = Position.getById(id);

        // Add user details to the position object for the frontend
        position.user_name = user.name;
        position.user_icon = user.icon_url;

        // Emit a WebSocket event for real-time position updates
        const io = socketUtil.io();
        if (io) {
            io.emit('position:update', {
                action: 'create',
                stockId: stock_id,
                position
            });
        }

        res.status(201).json({ id, message: 'Position created successfully' });
    } catch (error) {
        console.error('Error creating position:', error);
        res.status(500).json({ error: 'Failed to create position' });
    }
};

// Close a position
exports.closePosition = (req, res) => {
    try {
        const { id } = req.params;

        const position = Position.getById(id);
        if (!position) {
            return res.status(404).json({ error: 'Position not found' });
        }

        if (!position.is_open) {
            return res.status(400).json({ error: 'Position is already closed' });
        }

        // Get current stock price for closing
        const stock = Stock.getById(position.stock_id);
        if (!stock) {
            return res.status(404).json({ error: 'Associated stock not found' });
        }

        // Store the stock_id before closing for the WebSocket event
        const stockId = position.stock_id;
        const amount = position.amount;

        Position.close(id, stock.current_price);

        // Record this trade in the stock's activity
        Stock.recordTrade(stockId, amount);

        // Get updated position to return
        const updatedPosition = Position.getById(id);

        // Emit a WebSocket event for real-time position updates
        const io = socketUtil.io();
        if (io) {
            io.emit('position:update', {
                action: 'close',
                stockId,
                position: updatedPosition
            });
        }

        res.json({
            message: 'Position closed successfully',
            position: updatedPosition,
            profit_loss: (stock.current_price - position.open_price) * position.amount
        });
    } catch (error) {
        console.error('Error closing position:', error);
        res.status(500).json({ error: 'Failed to close position' });
    }
};