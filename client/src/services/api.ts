import axios from 'axios';
import { Stock, User, Position, PriceHistoryPoint, SimulationStatus, AppSettings } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Stock API calls
export const getStocks = () => api.get<Stock[]>('/stocks');
export const getStock = (id: number) => api.get<Stock>(`/stocks/${id}`);
export const createStock = (stock: Partial<Stock>) => api.post<{ id: number, message: string }>('/stocks', stock);
export const updateStock = (id: number, stock: Partial<Stock>) => api.put<{ message: string }>(`/stocks/${id}`, stock);
export const deleteStock = (id: number) => api.delete<{ message: string }>(`/stocks/${id}`);
export const getStockHistory = (id: number, limit?: number, granularity?: number) => api.get<PriceHistoryPoint[]>(`/stocks/${id}/history${limit ? `?limit=${limit}` : ''}${granularity ? `&granularity=${granularity}` : ''}`);
export const getStockLeaderboard = (id: number) => api.get<Position[]>(`/stocks/${id}/leaderboard`);
export const applyStockEvent = (id: number, value: number, message?: string) => api.post<{ message: string }>(`/stocks/${id}/event`, { value, message });

// User API calls
export const getUsers = () => api.get<User[]>('/users');
export const getUser = (id: number) => api.get<User>(`/users/${id}`);
export const createUser = (user: Partial<User>) => api.post<{ id: number, message: string }>('/users', user);
export const updateUser = (id: number, user: Partial<User>) => api.put<{ message: string }>(`/users/${id}`, user);
export const deleteUser = (id: number) => api.delete<{ message: string }>(`/users/${id}`);
export const getUserPositions = (id: number) => api.get<Position[]>(`/users/${id}/positions`);

// Position API calls
export const getPositions = () => api.get<Position[]>('/positions');
export const getPosition = (id: number) => api.get<Position>(`/positions/${id}`);
export const createPosition = (position: { stock_id: number, user_id: number, amount: number }) =>
    api.post<{ id: number, message: string }>('/positions', position);
export const closePosition = (id: number) => api.put<{ message: string, position: Position, profit_loss: number }>(`/positions/${id}/close`);

// Settings API calls
export const getSettings = () => api.get<AppSettings>('/settings');
export const updateSetting = (key: string, value: string) => api.put<{ message: string }>(`/settings/${key}`, { value });
export const updateMultipleSettings = (settings: Partial<AppSettings>) => api.put<{ message: string }>('/settings', settings);

// Simulation API calls
export const getSimulationStatus = () => api.get<SimulationStatus>('/simulation/status');
export const startSimulation = () => api.post<{ message: string, status: SimulationStatus }>('/simulation/start');
export const stopSimulation = () => api.post<{ message: string, status: SimulationStatus }>('/simulation/stop');
export const updateSimulationInterval = (interval: number) =>
    api.post<{ message: string, status: SimulationStatus }>('/simulation/interval', { interval });

export default api;