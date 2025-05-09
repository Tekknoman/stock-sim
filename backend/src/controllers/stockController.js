const Stock = require('../models/Stock');
const Position = require('../models/Position');
const db = require('../utils/db');

// Get all stocks
exports.getAllStocks = (req, res) => {
    try {
        const stocks = Stock.getAll();
        res.json(stocks);
    } catch (error) {
        console.error('Error getting stocks:', error);
        res.status(500).json({ error: 'Failed to get stocks' });
    }
};

// Get a stock by ID
exports.getStockById = (req, res) => {
    try {
        const stock = Stock.getById(req.params.id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.json(stock);
    } catch (error) {
        console.error('Error getting stock:', error);
        res.status(500).json({ error: 'Failed to get stock' });
    }
};

// Create a new stock
exports.createStock = (req, res) => {
    try {
        const { name, icon_url, color, volatility, base_value, buff_value } = req.body;

        if (!name || !base_value) {
            return res.status(400).json({ error: 'Name and base_value are required' });
        }

        const id = Stock.create({
            name,
            icon_url,
            color,
            volatility,
            base_value: parseFloat(base_value),
            buff_value: parseFloat(buff_value || 0)
        });

        res.status(201).json({ id, message: 'Stock created successfully' });
    } catch (error) {
        console.error('Error creating stock:', error);
        res.status(500).json({ error: 'Failed to create stock' });
    }
};

// Update a stock
exports.updateStock = (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon_url, color, volatility, buff_value } = req.body;

        const stock = Stock.getById(id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        Stock.update(id, {
            name: name || stock.name,
            icon_url: icon_url || stock.icon_url,
            color: color || stock.color,
            volatility: volatility || stock.volatility,
            buff_value: buff_value !== undefined ? parseFloat(buff_value) : stock.buff_value
        });

        res.json({ message: 'Stock updated successfully' });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
};

// Delete a stock
exports.deleteStock = (req, res) => {
    try {
        const { id } = req.params;

        const stock = Stock.getById(id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        // First, delete all positions related to this stock
        Position.deleteByStockId(id);

        // Then delete the stock history
        db.prepare('DELETE FROM stock_history WHERE stock_id = ?').run(id);

        // Finally, delete the stock itself
        Stock.delete(id);

        res.json({
            message: 'Stock deleted successfully',
            details: 'All related positions and history have been removed.'
        });
    } catch (error) {
        console.error('Error deleting stock:', error);
        res.status(500).json({ error: 'Failed to delete stock' });
    }
};

// Get price history for a stock
exports.getPriceHistory = (req, res) => {
    try {
        const { id } = req.params;
        const { limit, granularity } = req.query;
        const history = Stock.getPriceHistory(id, limit ? parseInt(limit) : 100, granularity ? parseInt(granularity) : 1);
        res.json(history);
    } catch (error) {
        console.error('Error getting price history:', error);
        res.status(500).json({ error: 'Failed to get price history' });
    }
};

// Get leaderboard for a stock (top positions)
exports.getStockLeaderboard = (req, res) => {
    try {
        const { id } = req.params;

        const positions = Position.getByStockId(id);
        res.json(positions);
    } catch (error) {
        console.error('Error getting stock leaderboard:', error);
        res.status(500).json({ error: 'Failed to get stock leaderboard' });
    }
};

// Set max value for a stock
exports.setMaxValue = (req, res) => {
    try {
        const { id } = req.params;
        const { maxValue } = req.body;

        // Validate input
        if (maxValue === undefined) {
            return res.status(400).json({ error: 'Max value is required' });
        }

        // Validate as a number and ensure it's positive
        const parsedMaxValue = parseFloat(maxValue);
        if (isNaN(parsedMaxValue) || parsedMaxValue <= 0) {
            return res.status(400).json({ error: 'Max value must be a positive number' });
        }

        // Get the stock
        const stock = Stock.getById(id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        // Update the max value
        Stock.update(id, { ...stock, max_value: parsedMaxValue });

        res.json({
            message: `Max value for ${stock.name} set to $${parsedMaxValue.toFixed(2)}`,
            stock: Stock.getById(id)
        });
    } catch (error) {
        console.error('Error setting max value:', error);
        res.status(500).json({ error: 'Failed to set max value' });
    }
};

// Manually set current price for a stock
exports.setCurrentPrice = (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;

        // Validate input
        if (price === undefined) {
            return res.status(400).json({ error: 'Price is required' });
        }

        // Get the stock
        const stock = Stock.getById(id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        // Update the price
        try {
            Stock.setPrice(id, price);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        // Get the updated stock
        const updatedStock = Stock.getById(id);

        res.json({
            message: `Price for ${stock.name} manually set to $${updatedStock.current_price.toFixed(2)}`,
            stock: updatedStock
        });
    } catch (error) {
        console.error('Error setting price:', error);
        res.status(500).json({ error: 'Failed to set price' });
    }
};