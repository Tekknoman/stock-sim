# Virtual Trading Game - Backend Documentation

## Overview

This document outlines the backend implementation of the Virtual Trading Game, a real-time stock market simulator. The backend is built with:

- **Node.js and Express**: For the RESTful API server
- **SQLite**: For data persistence
- **Socket.io**: For real-time updates and notifications

## Backend Components

### 1. Database Structure

The SQLite database includes the following tables:

- **stocks**: Stores stock information including name, icon URL, color theme, volatility level, price
- **users**: Stores participant information (name, icon)
- **positions**: Tracks open and closed trading positions
- **stock_history**: Records price history for each stock
- **settings**: Stores game configuration settings

### 2. API Endpoints

#### Stocks

- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/:id` - Get a specific stock
- `POST /api/stocks` - Create a new stock
- `PUT /api/stocks/:id` - Update a stock
- `DELETE /api/stocks/:id` - Delete a stock
- `GET /api/stocks/:id/history` - Get price history
- `GET /api/stocks/:id/leaderboard` - Get top positions for a stock
- `POST /api/stocks/:id/event` - Apply a manual event/buff/nerf to a stock

#### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `GET /api/users/:id/positions` - Get all positions for a user

#### Positions

- `GET /api/positions` - Get all positions
- `GET /api/positions/:id` - Get a specific position
- `POST /api/positions` - Create a new position
- `PUT /api/positions/:id/close` - Close a position

#### Settings

- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get a specific setting
- `PUT /api/settings/:key` - Update a setting
- `PUT /api/settings` - Update multiple settings at once

#### Simulation Control

- `GET /api/simulation/status` - Get simulation status
- `POST /api/simulation/start` - Start the simulation
- `POST /api/simulation/stop` - Stop the simulation
- `POST /api/simulation/interval` - Update the simulation interval

### 3. Simulation Engine

The backend includes a simulation engine that:

- **Updates stock prices** at regular intervals
- **Applies volatility** based on stock settings
- **Accounts for demand** (open positions impact price)
- **Includes random events** that affect prices
- **Supports manual events** for admin intervention
- **Broadcasts updates** via WebSockets (Socket.io) in real-time

#### Price Calculation Formula

Each stock's price is updated using this approach:

```
newPrice = currentPrice + baseVolatility + demandImpact + manualModifiers + randomEventFactor
```

Where:

- **baseVolatility**: Random change based on stock's volatility setting
- **demandImpact**: Effect of active positions on price
- **manualModifiers**: Admin-applied buffs/nerfs
- **randomEventFactor**: Occasional random events that simulate news

### 4. Real-time Updates

Socket.io is used to provide real-time updates:

- `prices:update` - Broadcasts updated stock prices
- `stock:event` - Announces stock events
- `simulation:state` - Notifies clients of simulation state changes

## Running the Backend

1. Install dependencies: `npm install`
2. Set up the database: `npm run setup`
3. Start the server: `npm start` (or `npm run dev` for development with auto-reload)

## Future Frontend Integration

The frontend will need to:

1. **Connect to real-time updates** via Socket.io
2. **Implement API calls** for CRUD operations
3. **Visualize stock data** with charts and indicators
4. **Build user interface** components:
   - Stock tiles/cards with mini-charts
   - User position management
   - Leaderboards
   - Admin controls for simulation

### Suggestions for Frontend Implementation

- **React Components**:
  - `StockTile`: Displays individual stock with mini-chart, price, trend indicators
  - `UserPanel`: Shows user positions, portfolio value, and performance
  - `LeaderBoard`: Displays top positions for each stock
  - `AdminPanel`: Controls for simulation and manual events

- **State Management**:
  - Use Zustand or Redux as specified in the concept document
  - Create stores for stocks, users, positions, and simulation state

- **Real-time Integration**:
  - Connect to Socket.io events in a central service
  - Update local state based on real-time events
  - Animate price changes for visual feedback

- **Data Visualization**:
  - Implement stock charts using recharts or chart.js
  - Show price trends and significant events
  - Highlight user positions on charts

## Advanced Features for Future Development

- **Session management**: Save/load game states
- **Tournament mode**: Time-limited competition with winners
- **Event scheduler**: Pre-program market events
- **Market news ticker**: Display random and scheduled events
- **Portfolio analytics**: Show diversification, risk metrics
- **Trading restrictions**: Add transaction fees, trading limits

---

*This backend implementation provides all the core functionality needed for the Virtual Trading Game. The frontend will connect to these APIs and socket events to create the interactive user interface described in the concept document.*