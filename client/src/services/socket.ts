import { io, Socket } from 'socket.io-client';
import { StockUpdate, StockEvent, SimulationStatus } from '../types';

// Use the same API URL for socket connection
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const sanitizeUrl = (url: string): string => {
            try {
                const parsedUrl = new URL(url);
                return `${parsedUrl.protocol}//${parsedUrl.host}`;
            } catch (e) {
                console.warn('Failed to parse socket URL, using as-is:', url);
                return url;
            }
        };

class SocketService {
    private socket: Socket | null = null;
    private listeners: { [event: string]: Function[] } = {};


    connect() {
        if (this.socket && this.socket.connected) {
            console.log('Socket.IO: Already connected.');
            return;
        }

        // if (this.socket && this.socket.connecting) {
        //     console.log('Socket.IO: Connection attempt already in progress.');
        //     return;
        // }

        // If a previous socket instance exists, disconnect and remove its listeners
        if (this.socket) {
            console.log('Socket.IO: Cleaning up old socket instance.');
            this.socket.disconnect();
            this.socket.removeAllListeners(); // Clean slate for the old instance
            this.socket = null; 
        }

        const sanitizedUrl = sanitizeUrl(SOCKET_URL);
        console.log(`Socket.IO: Attempting to connect to ${sanitizedUrl}`);

        this.socket = io(sanitizedUrl, {
            autoConnect: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            // transports: ['websocket'], // Allow Socket.IO to negotiate transport
        });

        this.socket.on('connect', () => {
            console.log(`Socket.IO: Connected successfully to ${sanitizedUrl} with id ${this.socket?.id}`);
            // Re-apply all stored listeners to this new/connected socket instance
            Object.keys(this.listeners).forEach(event => {
                this.listeners[event].forEach(callback => {
                    // Remove any existing listener for this event/callback pair before adding, to prevent duplicates
                    this.socket?.off(event, callback as any);
                    this.socket?.on(event, callback as any);
                });
            });
        });

        this.socket.on('connect_error', (err) => {
            console.error(`Socket.IO: Connection error to ${sanitizedUrl}: ${err.message}`, err);
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`Socket.IO: Disconnected from ${sanitizedUrl}: ${reason}`);
            // If the socket is manually disconnected or all retries fail, this.socket.active will be false.
            // Consider setting this.socket to null here if the reason indicates a permanent disconnect
            // and no further auto-reconnection will occur.
            // For now, let a new call to connect() handle re-initialization.
        });
    }

    disconnect() {
        if (this.socket) {
            console.log('Socket.IO: Disconnecting...');
            this.socket.disconnect();
            this.socket.removeAllListeners(); // Clean up listeners on the old instance
            this.socket = null; // Set to null so a new connect() call creates a fresh instance
            console.log('Socket.IO: Disconnected and instance cleaned up.');
        } else {
            console.log('Socket.IO: No socket instance to disconnect.');
        }
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
        // Store the listener intent
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        // Avoid duplicate storage of the same callback function in our internal array
        if (!this.listeners[event].includes(callback)) {
            this.listeners[event].push(callback);
        }

        // If socket exists and is connected, attach listener immediately.
        // Otherwise, it will be attached when the 'connect' event fires.
        if (this.socket && this.socket.connected) { // Check for connected state
            this.socket.off(event, callback as any); // Remove first to prevent duplicates on the socket instance
            this.socket.on(event, callback as any);
        }
    }

    removeListener(event: string, callback: Function) {
        // Remove from our stored listeners
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            if (this.listeners[event].length === 0) {
                delete this.listeners[event];
            }
        }

        // Remove from the active socket instance
        if (this.socket) {
            this.socket.off(event, callback as any);
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;