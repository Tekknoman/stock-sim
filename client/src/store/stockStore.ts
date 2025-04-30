import { create } from 'zustand';
import { Stock, StockUpdate, PriceHistoryPoint } from '../types';
import * as api from '../services/api';

interface StockState {
    stocks: Stock[];
    loading: boolean;
    error: string | null;
    fetchStocks: () => Promise<void>;
    updateStockPrices: (updates: StockUpdate[]) => void;
    getStockHistory: (stockId: number, limit?: number) => Promise<PriceHistoryPoint[]>;
    createStock: (stock: Partial<Stock>) => Promise<number>;
    updateStock: (id: number, stock: Partial<Stock>) => Promise<void>;
    deleteStock: (id: number) => Promise<void>;
    applyStockEvent: (id: number, value: number, message?: string) => Promise<void>;
    trendingStocks: () => Stock[];
    topGainers: () => Stock[];
    topLosers: () => Stock[];
}

const useStockStore = create<StockState>((set, get) => ({
    stocks: [],
    loading: false,
    error: null,

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

    getStockHistory: async (stockId: number, limit?: number): Promise<PriceHistoryPoint[]> => {
        try {
            const response = await api.getStockHistory(stockId, limit);
            return response.data;
        } catch (error) {
            console.error('Error fetching stock history:', error);
            return [];
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
    }
}));

export default useStockStore;