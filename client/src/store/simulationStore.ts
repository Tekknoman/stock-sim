import { create } from 'zustand';
import { SimulationStatus, AppSettings } from '../types';
import * as api from '../services/api';

interface SimulationState {
    status: SimulationStatus;
    settings: AppSettings;
    loading: boolean;
    error: string | null;
    fetchStatus: () => Promise<void>;
    fetchSettings: () => Promise<void>;
    startSimulation: () => Promise<void>;
    stopSimulation: () => Promise<void>;
    updateInterval: (interval: number) => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const useSimulationStore = create<SimulationState>((set, get) => ({
    status: { isRunning: false, interval: 5000 },
    settings: {
        simulation_interval: '5000',
        simulation_active: 'false',
        demand_impact_weight: '0.1',
        random_event_chance: '0.05',
        random_event_impact: '0.1'
    },
    loading: false,
    error: null,

    fetchStatus: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.getSimulationStatus();
            set({ status: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching simulation status:', error);
            set({ error: 'Failed to fetch simulation status', loading: false });
        }
    },

    fetchSettings: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.getSettings();
            set({ settings: response.data, loading: false });
        } catch (error) {
            console.error('Error fetching settings:', error);
            set({ error: 'Failed to fetch settings', loading: false });
        }
    },

    startSimulation: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.startSimulation();
            set({
                status: response.data.status,
                loading: false
            });
        } catch (error) {
            console.error('Error starting simulation:', error);
            set({ error: 'Failed to start simulation', loading: false });
        }
    },

    stopSimulation: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.stopSimulation();
            set({
                status: response.data.status,
                loading: false
            });
        } catch (error) {
            console.error('Error stopping simulation:', error);
            set({ error: 'Failed to stop simulation', loading: false });
        }
    },

    updateInterval: async (interval: number) => {
        set({ loading: true, error: null });
        try {
            const response = await api.updateSimulationInterval(interval);
            set({
                status: response.data.status,
                loading: false
            });

            // Also update in settings for consistency
            await get().updateSettings({ simulation_interval: interval.toString() });
        } catch (error) {
            console.error('Error updating interval:', error);
            set({ error: 'Failed to update interval', loading: false });
        }
    },

    updateSettings: async (newSettings: Partial<AppSettings>) => {
        set({ loading: true, error: null });
        try {
            await api.updateMultipleSettings(newSettings);
            set(state => ({
                settings: { ...state.settings, ...newSettings },
                loading: false
            }));
        } catch (error) {
            console.error('Error updating settings:', error);
            set({ error: 'Failed to update settings', loading: false });
        }
    }
}));

export default useSimulationStore;