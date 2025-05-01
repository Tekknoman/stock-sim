import { io, Socket } from 'socket.io-client';
import { StockUpdate, StockEvent, SimulationStatus } from '../types';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

class SocketService {
    private socket: Socket | null = null;
    private listeners: { [event: string]: Function[] } = {};

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL);

        // Re-attach listeners if reconnecting
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event].forEach(callback => {
                this.socket?.on(event, (...args: any[]): void => callback(...args));
            });
        });

        console.log('Socket connected');
    }

    disconnect() {
        if (!this.socket) return;

        this.socket.disconnect();
        this.socket = null;
        console.log('Socket disconnected');
    }

    onPriceUpdate(callback: (updates: StockUpdate[]) => void) {
        this.addListener('prices:update', callback);
    }

    onStockEvent(callback: (event: { stock_id: number; stock_name: string; message: string; value: number }) => void) {
        this.addListener('stock:event', callback);
    }

    onSimulationState(callback: (state: { active: boolean }) => void) {
        this.addListener('simulation:state', callback);
    }

    // New method to handle position updates
    onPositionUpdate(callback: (data: { action: 'create' | 'close', stockId: number, position: any }) => void) {
        this.addListener('position:update', callback);
    }

    private addListener(event: string, callback: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(callback);

        if (this.socket) {
            this.socket.on(event, (...args: any[]): void => callback(...args));
        }
    }

    removeListener(event: string, callback: Function) {
        if (this.socket) {
            this.socket.off(event, callback as any);
        }

        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;