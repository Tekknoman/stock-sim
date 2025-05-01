import { create } from 'zustand';
import { Position } from '../types';
import * as api from '../services/api';
import socketService from '../services/socket';

interface PositionState {
    positions: Position[];
    loading: boolean;
    error: string | null;
    stockPositions: { [key: number]: Position[] }; // Cache of positions by stock ID
    fetchPositions: () => Promise<void>;
    createPosition: (stockId: number, userId: number, amount: number) => Promise<number>;
    closePosition: (positionId: number) => Promise<void>;
    getPositionsForStock: (stockId: number) => Promise<Position[]>;
    getPositionById: (id: number) => Promise<Position | null>;
    setupSocketListeners: () => () => void; // Returns cleanup function
    updateStockPositionsCache: (stockId: number, positions: Position[]) => void;
}

const usePositionStore = create<PositionState>((set, get) => ({
    positions: [],
    stockPositions: {},
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
            const positions = response.data;
            
            // Update the cache
            get().updateStockPositionsCache(stockId, positions);
            
            return positions;
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
    },
    
    updateStockPositionsCache: (stockId: number, positions: Position[]) => {
        set((state) => ({
            stockPositions: {
                ...state.stockPositions,
                [stockId]: positions
            }
        }));
    },
    
    setupSocketListeners: () => {
        // Setup the socket listener for position updates
        const handlePositionUpdate = (data: { action: 'create' | 'close', stockId: number, position: any }) => {
            const { action, stockId, position } = data;
            
            // Update cached positions for the affected stock
            if (get().stockPositions[stockId]) {
                const currentPositions = [...get().stockPositions[stockId]];
                
                if (action === 'close') {
                    // Remove the closed position
                    const updatedPositions = currentPositions.filter(p => p.id !== position.id);
                    get().updateStockPositionsCache(stockId, updatedPositions);
                } else if (action === 'create') {
                    // Add the new position
                    get().updateStockPositionsCache(stockId, [...currentPositions, position]);
                }
            }
            
            // Also update the main positions array
            get().fetchPositions();
        };
        
        // Register the listener
        socketService.onPositionUpdate(handlePositionUpdate);
        
        // Return cleanup function
        return () => {
            socketService.removeListener('position:update', handlePositionUpdate);
        };
    }
}));

export default usePositionStore;