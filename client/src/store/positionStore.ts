import { create } from 'zustand';
import { Position } from '../types';
import * as api from '../services/api';

interface PositionState {
    positions: Position[];
    loading: boolean;
    error: string | null;
    fetchPositions: () => Promise<void>;
    createPosition: (stockId: number, userId: number, amount: number) => Promise<number>;
    closePosition: (positionId: number) => Promise<void>;
    getPositionsForStock: (stockId: number) => Promise<Position[]>;
    getPositionById: (id: number) => Promise<Position | null>;
}

const usePositionStore = create<PositionState>((set, get) => ({
    positions: [],
    loading: false,
    error: null,

    fetchPositions: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.getPositions();
            set({ positions: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching positions:', error);
            set({ error: 'Failed to fetch positions', loading: false });
        }
    },

    createPosition: async (stockId: number, userId: number, amount: number): Promise<number> => {
        set({ loading: true, error: null });
        try {
            const response = await api.createPosition({
                stock_id: stockId,
                user_id: userId,
                amount
            });
            await get().fetchPositions(); // Refresh positions after creating
            set({ loading: false });
            return response.data.id;
        } catch (error) {
            console.error('Error creating position:', error);
            set({ error: 'Failed to create position', loading: false });
            return -1;
        }
    },

    closePosition: async (positionId: number): Promise<void> => {
        set({ loading: true, error: null });
        try {
            await api.closePosition(positionId);
            await get().fetchPositions(); // Refresh positions after closing
            set({ loading: false });
        } catch (error) {
            console.error('Error closing position:', error);
            set({ error: 'Failed to close position', loading: false });
        }
    },

    getPositionsForStock: async (stockId: number): Promise<Position[]> => {
        try {
            const response = await api.getStockLeaderboard(stockId);
            return response.data;
        } catch (error) {
            console.error('Error fetching stock positions:', error);
            return [];
        }
    },

    getPositionById: async (id: number): Promise<Position | null> => {
        try {
            const response = await api.getPosition(id);
            return response.data;
        } catch (error) {
            console.error('Error fetching position:', error);
            return null;
        }
    }
}));

export default usePositionStore;