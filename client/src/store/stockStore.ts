import { create } from 'zustand';
import { Stock, StockUpdate, PriceHistoryPoint } from '../types';
import * as api from '../services/api';
import socketService from '../services/socket';
import useSimulationStore from './simulationStore';

// Store stock price histories with timespan info
interface StockHistoryState {
  [stockId: number]: {
    data: PriceHistoryPoint[];
    lastFetch: number;
    timeSpan: string;
    isLoading: boolean;
    lastUpdate: number; // Track the last WebSocket update time
  };
}

interface StockState {
    stocks: Stock[];
    loading: boolean;
    error: string | null;
    stockHistories: StockHistoryState;
    fetchStocks: () => Promise<void>;
    updateStockPrices: (updates: StockUpdate[]) => void;
    getStockHistory: (stockId: number, timeSpan: string, limit?: number) => Promise<PriceHistoryPoint[]>;
    addPriceHistoryPoint: (stockId: number, price: number, timestamp?: string) => void;
    createStock: (stock: Partial<Stock>) => Promise<number>;
    updateStock: (id: number, stock: Partial<Stock>) => Promise<void>;
    deleteStock: (id: number) => Promise<void>;
    applyStockEvent: (id: number, value: number, message?: string) => Promise<void>;
    trendingStocks: () => Stock[];
    topGainers: () => Stock[];
    topLosers: () => Stock[];
    setupWebSocketListeners: () => () => void; // setup + cleanup function
}

// Helper to determine if history needs refresh based on time and span
const needsRefresh = (lastFetch: number, currentTimeSpan: string, storedTimeSpan?: string): boolean => {
    const now = Date.now();
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes

    return (
        !lastFetch || // Never fetched
        (now - lastFetch > MAX_AGE) || // Stale data
        (storedTimeSpan !== currentTimeSpan) // TimeSpan changed
    );
};

// Calculate how many points to fetch based on timespan and simulation interval
const calculatePointsForTimeSpan = (timeSpan: string, simInterval: number): number => {
    // Convert simulation interval to seconds (from ms)
    const simIntervalSec = simInterval / 1000;
    
    // Calculate points based on timespan duration and simulation interval
    switch (timeSpan) {
        case "1m": 
            return Math.min(60, Math.ceil(60 / simIntervalSec));
        case "5m": 
            return Math.min(150, Math.ceil(300 / simIntervalSec));
        case "15m": 
            return Math.min(180, Math.ceil(900 / simIntervalSec));
        case "30m": 
            return Math.min(200, Math.ceil(1800 / simIntervalSec));
        case "1h": 
            return Math.min(240, Math.ceil(3600 / simIntervalSec));
        case "all": 
            return 500; // Max points for all history
        default: 
            return 240;
    }
};

// Helper function to get simulation interval
const getSimulationInterval = (): number => {
    try {
        // Get the status from the simulation store
        const simStore = useSimulationStore.getState();
        return simStore.status.interval || 5000; // Default to 5 seconds if not available
    } catch (e) {
        // Fallback to default
        return 5000;
    }
};

// Helper function to normalize price history data
const normalizePriceHistoryPoint = (point: any, stockId: number): PriceHistoryPoint => {
    // Format from API: { price: 3.42, timestamp: "2025-05-01 07:20:06", ... }
    if (point.price !== undefined && point.timestamp !== undefined) {
        return {
            stock_id: stockId,
            price: point.price,
            timestamp: point.timestamp
        };
    }
    
    // Format from WebSocket: { current_price: 3.11, ... }
    if (point.current_price !== undefined) {
        return {
            stock_id: stockId,
            price: point.current_price,
            timestamp: new Date().toISOString() // Use current time if no timestamp provided
        };
    }
    
    // Default case (shouldn't happen, but provide fallback)
    console.warn('Unrecognized price history format:', point);
    return {
        stock_id: stockId,
        price: typeof point === 'number' ? point : 0,
        timestamp: new Date().toISOString()
    };
};

const useStockStore = create<StockState>((set, get) => ({
    stocks: [],
    loading: false,
    error: null,
    stockHistories: {},

    fetchStocks: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.getStocks();
            set({ stocks: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching stocks:', error);
            set({ error: 'Failed to fetch stocks', loading: false });
        }
    },

    updateStockPrices: (updates: StockUpdate[]) => {
        set(state => ({
            stocks: state.stocks.map(stock => {
                const update = updates.find(u => u.id === stock.id);
                if (!update) return stock;

                return {
                    ...stock,
                    current_price: update.current_price
                };
            })
        }));
    },

    getStockHistory: async (stockId: number, timeSpan: string, limit?: number): Promise<PriceHistoryPoint[]> => {
        const { stockHistories } = get();
        const stockHistory = stockHistories[stockId];
        
        // Get simulation interval for proper limit calculation
        const simInterval = getSimulationInterval();
        const calculatedLimit = limit || calculatePointsForTimeSpan(timeSpan, simInterval);
        
        // Check if we need to refresh data
        if (!stockHistory || needsRefresh(stockHistory.lastFetch, timeSpan, stockHistory.timeSpan)) {
            // Mark as loading
            set(state => ({
                stockHistories: {
                    ...state.stockHistories,
                    [stockId]: {
                        ...(state.stockHistories[stockId] || {}),
                        isLoading: true,
                        timeSpan
                    }
                }
            }));
            
            try {
                const response = await api.getStockHistory(stockId, calculatedLimit);
                const now = Date.now();
                
                // Normalize the data to ensure consistent format
                const normalizedData = response.data.map(point => 
                    normalizePriceHistoryPoint(point, stockId)
                );
                
                // Update the store with new data
                set(state => ({
                    stockHistories: {
                        ...state.stockHistories,
                        [stockId]: {
                            data: normalizedData,
                            lastFetch: now,
                            timeSpan,
                            isLoading: false,
                            lastUpdate: now
                        }
                    }
                }));
                
                return normalizedData;
            } catch (error) {
                console.error('Error fetching stock history:', error);
                
                // Keep existing data but mark as not loading
                set(state => ({
                    stockHistories: {
                        ...state.stockHistories,
                        [stockId]: {
                            ...(state.stockHistories[stockId] || { data: [], lastUpdate: Date.now() }),
                            isLoading: false
                        }
                    }
                }));
                
                // Return existing data or empty array
                return stockHistory?.data || [];
            }
        }
        
        // Return cached data
        return stockHistory.data;
    },

    addPriceHistoryPoint: (stockId: number, price: number, timestamp?: string) => {
        const now = timestamp ? new Date(timestamp) : new Date();
        
        // Only add if we have history for this stock already
        if (get().stockHistories[stockId]) {
            set(state => {
                const stockHistory = state.stockHistories[stockId];
                if (!stockHistory) return state; // Guard against undefined
                
                // Get current time
                const currentTime = Date.now();
                
                // Get simulation interval
                const simInterval = getSimulationInterval();
                
                // Check if we should add a new point based on simulation interval and last update
                const shouldAddPoint = 
                    !stockHistory.lastUpdate || 
                    (currentTime - stockHistory.lastUpdate >= simInterval * 0.9); // Add a small buffer
                
                if (!shouldAddPoint) {
                    return state; // Skip adding point if too soon
                }
                
                // Create new point with consistent format
                const newPoint: PriceHistoryPoint = {
                    stock_id: stockId,
                    price,
                    timestamp: timestamp || now.toISOString()
                };
                
                // Filter old points based on timespan
                let updatedData = [...stockHistory.data, newPoint];
                
                // Sort by timestamp
                updatedData.sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                
                // Remove older points outside the relevant timespan
                if (stockHistory.timeSpan !== 'all') {
                    const cutoffTime = new Date();
                    switch (stockHistory.timeSpan) {
                        case "1m": cutoffTime.setMinutes(cutoffTime.getMinutes() - 1); break;
                        case "5m": cutoffTime.setMinutes(cutoffTime.getMinutes() - 5); break;
                        case "15m": cutoffTime.setMinutes(cutoffTime.getMinutes() - 15); break;
                        case "30m": cutoffTime.setMinutes(cutoffTime.getMinutes() - 30); break;
                        case "1h": cutoffTime.setHours(cutoffTime.getHours() - 1); break;
                    }
                    
                    updatedData = updatedData.filter(point => 
                        new Date(point.timestamp) >= cutoffTime
                    );
                }
                
                // Ensure we maintain the right density of points based on simulation interval
                const maxPoints = calculatePointsForTimeSpan(stockHistory.timeSpan, simInterval);
                
                // If we have more points than needed, sample them strategically
                if (updatedData.length > maxPoints) {
                    // Ensure we keep the first and last points for proper graph shape
                    const first = updatedData[0];
                    const last = updatedData[updatedData.length - 1];
                    
                    // For the rest, sample evenly
                    const middleData = updatedData.slice(1, -1);
                    const step = Math.ceil(middleData.length / (maxPoints - 2));
                    
                    const sampledMiddle = middleData.filter((_, index) => index % step === 0);
                    
                    // Combine with first and last points
                    updatedData = [first, ...sampledMiddle, last];
                }
                
                return {
                    stockHistories: {
                        ...state.stockHistories,
                        [stockId]: {
                            ...stockHistory,
                            data: updatedData,
                            lastUpdate: currentTime
                        }
                    }
                };
            });
        }
    },

    createStock: async (stock: Partial<Stock>): Promise<number> => {
        set({ loading: true, error: null });
        try {
            const response = await api.createStock(stock);
            await get().fetchStocks(); // Refresh stocks after creating
            return response.data.id;
        } catch (error) {
            console.error('Error creating stock:', error);
            set({ error: 'Failed to create stock', loading: false });
            return -1;
        }
    },

    updateStock: async (id: number, stock: Partial<Stock>): Promise<void> => {
        set({ loading: true, error: null });
        try {
            await api.updateStock(id, stock);
            await get().fetchStocks(); // Refresh stocks after updating
            set({ loading: false });
        } catch (error) {
            console.error('Error updating stock:', error);
            set({ error: 'Failed to update stock', loading: false });
        }
    },

    deleteStock: async (id: number): Promise<void> => {
        set({ loading: true, error: null });
        try {
            await api.deleteStock(id);
            set(state => ({
                stocks: state.stocks.filter(stock => stock.id !== id),
                loading: false
            }));
        } catch (error) {
            console.error('Error deleting stock:', error);
            set({ error: 'Failed to delete stock', loading: false });
        }
    },

    applyStockEvent: async (id: number, value: number, message?: string): Promise<void> => {
        try {
            await api.applyStockEvent(id, value, message);
        } catch (error) {
            console.error('Error applying stock event:', error);
        }
    },

    trendingStocks: () => {
        // Return stocks with most recent price changes
        return [...get().stocks].sort((a, b) => Math.abs(b.current_price - b.base_value) - Math.abs(a.current_price - a.base_value)).slice(0, 5);
    },

    topGainers: () => {
        // Return top 5 stocks with highest percentage gain
        return [...get().stocks].sort((a, b) => {
            const aChange = (a.current_price - a.base_value) / a.base_value;
            const bChange = (b.current_price - b.base_value) / b.base_value;
            return bChange - aChange;
        }).slice(0, 5);
    },

    topLosers: () => {
        // Return top 5 stocks with biggest percentage loss
        return [...get().stocks].sort((a, b) => {
            const aChange = (a.current_price - a.base_value) / a.base_value;
            const bChange = (b.current_price - b.base_value) / b.base_value;
            return aChange - bChange;
        }).slice(0, 5);
    },

    setupWebSocketListeners: () => {
        socketService.connect();
        
        // Set up a real-time listener for price updates
        const handlePriceUpdate = (updates: StockUpdate[]) => {
            // Update stock prices in the store
            get().updateStockPrices(updates);
            
            // Also add new data points to each stock's history
            updates.forEach(update => {
                get().addPriceHistoryPoint(update.id, update.current_price);
            });
        };

        socketService.onPriceUpdate(handlePriceUpdate);
        
        // Return cleanup function
        return () => {
            socketService.removeListener("prices:update", handlePriceUpdate);
        };
    }
}));

export default useStockStore;