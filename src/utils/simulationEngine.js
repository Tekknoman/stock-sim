const Stock = require('../models/Stock');
const Position = require('../models/Position');
const Settings = require('../models/Settings');

class SimulationEngine {
    constructor(io) {
        this.io = io; // Socket.io instance for real-time updates
        this.interval = null;
        this.isRunning = false;
        this.volatilityFactors = {
            'Low': 0.01,  // 1% max change
            'Medium': 0.03, // 3% max change
            'High': 0.08   // 8% max change
        };
    }

    // Start the simulation
    async start() {
        if (this.isRunning) return;

        try {
            // Get simulation interval from settings
            const intervalMs = parseInt(Settings.get('simulation_interval') || '5000', 10);

            // Update the simulation status
            Settings.set('simulation_active', 'true');
            this.isRunning = true;

            // Start the simulation loop
            this.interval = setInterval(() => this.updatePrices(), intervalMs);
            console.log(`Simulation started with interval: ${intervalMs}ms`);

            // Broadcast simulation state
            this.io.emit('simulation:state', { active: true });
        } catch (error) {
            console.error('Error starting simulation:', error);
        }
    }

    // Stop the simulation
    async stop() {
        if (!this.isRunning) return;

        try {
            clearInterval(this.interval);
            this.interval = null;
            this.isRunning = false;

            // Update the simulation status
            Settings.set('simulation_active', 'false');
            console.log('Simulation stopped');

            // Broadcast simulation state
            this.io.emit('simulation:state', { active: false });
        } catch (error) {
            console.error('Error stopping simulation:', error);
        }
    }

    // Update the simulation interval
    async updateInterval(intervalMs) {
        try {
            // Validate the interval
            intervalMs = parseInt(intervalMs, 10);
            if (isNaN(intervalMs) || intervalMs < 1000) {
                throw new Error('Invalid interval value');
            }

            // Update the setting
            Settings.set('simulation_interval', intervalMs.toString());

            // Restart the simulation if it's running
            if (this.isRunning) {
                await this.stop();
                await this.start();
            }

            console.log(`Simulation interval updated to ${intervalMs}ms`);
        } catch (error) {
            console.error('Error updating simulation interval:', error);
        }
    }

    // Main price update function
    async updatePrices() {
        try {
            const stocks = Stock.getAll();
            const demandImpactWeight = parseFloat(Settings.get('demand_impact_weight') || '0.1');
            const randomEventChance = parseFloat(Settings.get('random_event_chance') || '0.05');
            const randomEventImpact = parseFloat(Settings.get('random_event_impact') || '0.1');

            const updatedStocks = [];

            for (const stock of stocks) {
                // Calculate base volatility change
                const volatilityFactor = this.volatilityFactors[stock.volatility] || 0.03; // default to Medium
                const baseChange = (Math.random() * 2 - 1) * volatilityFactor * stock.current_price;

                // Calculate demand impact
                let demandImpact = 0;
                const demand = Position.getTotalDemandForStock(stock.id);
                if (demand && demand.total_demand) {
                    // Higher demand pushes prices up, logarithmically
                    demandImpact = Math.log10(1 + demand.total_demand) * demandImpactWeight * stock.current_price;
                }

                // Include manual buff/nerf value
                const buffValue = stock.buff_value || 0;

                // Calculate random event impact
                let randomEvent = null;
                let eventImpact = 0;
                if (Math.random() < randomEventChance) {
                    const eventDirection = Math.random() > 0.5 ? 1 : -1;
                    eventImpact = eventDirection * Math.random() * randomEventImpact * stock.current_price;

                    if (Math.abs(eventImpact) > stock.current_price * 0.02) { // Only announce significant events
                        randomEvent = {
                            type: eventDirection > 0 ? 'positive' : 'negative',
                            impact: eventImpact,
                            message: this.generateRandomEventMessage(eventDirection > 0)
                        };
                    }
                }

                // Calculate new price, ensuring it doesn't go negative
                let newPrice = stock.current_price + baseChange + demandImpact + buffValue + eventImpact;
                newPrice = Math.max(0.01, newPrice); // Minimum price of 0.01

                // Round to 2 decimal places for display
                newPrice = Math.round(newPrice * 100) / 100;

                // Update stock price in database
                Stock.updatePrice(stock.id, newPrice);

                // Add to updated stocks for broadcasting
                updatedStocks.push({
                    id: stock.id,
                    name: stock.name,
                    previous_price: stock.current_price,
                    current_price: newPrice,
                    change: newPrice - stock.current_price,
                    change_percent: ((newPrice - stock.current_price) / stock.current_price) * 100,
                    event: randomEvent,
                    demand: demand ? demand.total_demand : 0
                });
            }

            // Broadcast the price updates
            this.io.emit('prices:update', updatedStocks);

        } catch (error) {
            console.error('Error updating stock prices:', error);
        }
    }

    // Helper to generate random event messages
    generateRandomEventMessage(isPositive) {
        const positiveMessages = [
            "Earnings beat expectations!",
            "New product announcement!",
            "Surprise merger announced!",
            "Positive analyst ratings!",
            "Industry demand rising!",
            "Market sentiment improving!",
            "Breakthrough innovation revealed!",
            "Cost-cutting measures successful!"
        ];

        const negativeMessages = [
            "Earnings missed targets",
            "Product recall announced",
            "CEO resignation",
            "Regulatory issues emerging",
            "Industry downturn",
            "Market sentiment declining",
            "Competition increasing",
            "Supply chain disruptions"
        ];

        const messages = isPositive ? positiveMessages : negativeMessages;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Apply manual buff/nerf to a stock
    async applyManualEvent(stockId, value, message) {
        try {
            // Get the stock
            const stock = Stock.getById(stockId);
            if (!stock) {
                throw new Error('Stock not found');
            }

            // Update the buff value
            Stock.update(stockId, { ...stock, buff_value: value });

            // Broadcast the event
            this.io.emit('stock:event', {
                stock_id: stockId,
                stock_name: stock.name,
                message: message || (value >= 0 ? 'Positive event' : 'Negative event'),
                value: value
            });

            console.log(`Applied manual event to stock ${stock.name}: ${value > 0 ? '+' : ''}${value}`);

            return true;
        } catch (error) {
            console.error('Error applying manual event:', error);
            return false;
        }
    }

    // Get the current state of the simulation
    getStatus() {
        return {
            isRunning: this.isRunning,
            interval: parseInt(Settings.get('simulation_interval') || '5000', 10)
        };
    }
}

module.exports = SimulationEngine;