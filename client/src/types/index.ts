export interface Stock {
    id: number;
    name: string;
    icon_url: string | null;
    color: string;
    volatility: 'Low' | 'Medium' | 'High';
    base_value: number;
    current_price: number;
    buff_value: number;
    created_at: string;
}

export interface StockUpdate {
    id: number;
    name: string;
    previous_price: number;
    current_price: number;
    change: number;
    change_percent: number;
    event: StockEvent | null;
    demand: number;
}

export interface StockEvent {
    type: 'positive' | 'negative';
    impact: number;
    message: string;
}

export interface User {
    id: number;
    name: string;
    icon_url: string | null;
    created_at: string;
}

export interface Position {
    id: number;
    stock_id: number;
    user_id: number;
    amount: number;
    open_price: number;
    close_price: number | null;
    is_open: boolean;
    created_at: string;
    closed_at: string | null;

    // Joined data
    stock_name?: string;
    user_name?: string;
    current_price?: number;
    profit_loss?: number;
    percent_change?: number;
    color?: string;
    user_icon?: string;
}

export interface PriceHistoryPoint {
    price: number;
    timestamp: string;
    stock_id?: number;
}

export interface SimulationStatus {
    isRunning: boolean;
    interval: number;
}

export interface AppSettings {
    simulation_interval: string;
    simulation_active: string;
    demand_impact_weight: string;
    random_event_chance: string;
    random_event_impact: string;
}