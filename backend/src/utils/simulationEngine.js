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

        // Record last trading activity check time to optimize performance
        this.lastVolumeReset = new Date();
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

    // Calculate volume decay factor based on time since last trade
    calculateVolumeDecayFactor(stockId) {
        const activity = Stock.getTradingActivity(stockId);

        // If no trading activity recorded or no last trade time, use a default moderate decay
        if (!activity || !activity.lastTradeTime) {
            return 0.002; // Default decay rate
        }

        // Get decay settings
        const decayRate = parseFloat(Settings.get('volume_decay_rate') || '0.002');
        const decayThresholdMinutes = parseFloat(Settings.get('volume_decay_threshold') || '60');

        // Calculate minutes since last trade
        const now = new Date();
        const minutesSinceLastTrade = (now.getTime() - activity.lastTradeTime.getTime()) / (1000 * 60);

        // No decay if recent trading activity
        if (minutesSinceLastTrade < decayThresholdMinutes) {
            return 0;
        }

        // Calculate exponential decay factor based on how long since last trade
        // More time = stronger decay; formula: base_rate * e^((minutes - threshold)/(24*60))
        // Dividing by 1440 (24*60) to keep the same scale as before when using hours
        const exponent = (minutesSinceLastTrade - decayThresholdMinutes) / 1440;
        const decayFactor = decayRate * Math.exp(exponent);

        // Cap the decay factor to prevent extreme drops
        return Math.min(decayFactor, 0.05);
    }

    // Main price update function
    async updatePrices() {
        try {
            const stocks = Stock.getAll();
            const demandImpactWeight = parseFloat(Settings.get('demand_impact_weight') || '0.1');
            const randomEventChance = parseFloat(Settings.get('random_event_chance') || '0.05');
            const randomEventImpact = parseFloat(Settings.get('random_event_impact') || '0.1');

            // Reset trading volumes daily to prevent accumulated volume from masking inactivity
            const now = new Date();
            if (now.getDate() !== this.lastVolumeReset.getDate() ||
                now.getMonth() !== this.lastVolumeReset.getMonth() ||
                now.getFullYear() !== this.lastVolumeReset.getFullYear()) {
                Stock.resetTradingVolumes();
                this.lastVolumeReset = now;
                console.log('Daily trading volume reset performed');
            }

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

                // Calculate volume decay based on trading activity
                const decayFactor = this.calculateVolumeDecayFactor(stock.id);
                const volumeDecay = -decayFactor * stock.current_price;

                // Volume decay message for significant decay
                let volumeDecayEvent = null;
                if (Math.abs(volumeDecay) > stock.current_price * 0.01) {
                    volumeDecayEvent = {
                        type: 'negative',
                        impact: volumeDecay,
                        message: `Low trading volume causing value decay`
                    };
                }

                // Calculate max value correction if needed
                let maxValueCorrection = 0;
                if (stock.max_value && stock.current_price > stock.max_value) {
                    // Apply a strong negative correction proportional to how much it exceeds the max value
                    const excessPercentage = (stock.current_price - stock.max_value) / stock.max_value;
                    // Progressive correction: the more it exceeds, the stronger the correction
                    maxValueCorrection = -excessPercentage * 0.1 * stock.current_price;
                }

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
                let newPrice = stock.current_price + baseChange + demandImpact + buffValue + eventImpact + maxValueCorrection + volumeDecay;
                newPrice = Math.max(0.01, newPrice); // Minimum price of 0.01

                // If there's a max value and the price still exceeds it (perhaps due to large positive factors),
                // cap the price at the max value
                if (stock.max_value && newPrice > stock.max_value) {
                    newPrice = stock.max_value;
                }

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
                    event: randomEvent || volumeDecayEvent, // Show either random event or volume decay event
                    demand: demand ? demand.total_demand : 0,
                    trade_volume: stock.trade_volume || 0
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
        // ...existing code...
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