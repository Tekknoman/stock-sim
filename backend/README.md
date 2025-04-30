# Virtual Trading Game

A real-time, interactive stock market simulator for educational events, workshops, and scout camps.

## Overview

This platform allows participants to buy and sell virtual stocks with play money through an interactive dashboard. The simulation includes realistic stock behavior influenced by supply, demand, and volatility.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the environment example file:
   ```
   cp .env.example .env
   ```
4. Set up the database:
   ```
   npm run setup
   ```

### Running the Application

For development:
```
npm run dev
```

For production:
```
npm start
```

The server will run on http://localhost:3000 by default.

## Backend Architecture

The backend is built with:
- **Express.js**: RESTful API
- **SQLite**: Database
- **Socket.io**: Real-time updates

See [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md) for detailed information.

## API Documentation

### Stock Management

- `GET /api/stocks`: Get all stocks
- `GET /api/stocks/:id`: Get stock details
- `POST /api/stocks`: Create a new stock
- `PUT /api/stocks/:id`: Update stock information
- `DELETE /api/stocks/:id`: Delete a stock
- `GET /api/stocks/:id/history`: Get price history
- `GET /api/stocks/:id/leaderboard`: Get top positions

### User Management

- `GET /api/users`: Get all users
- `GET /api/users/:id`: Get user details
- `POST /api/users`: Create a new user
- `PUT /api/users/:id`: Update user information
- `DELETE /api/users/:id`: Delete a user
- `GET /api/users/:id/positions`: Get user's positions

### Position Management

- `GET /api/positions`: Get all positions
- `GET /api/positions/:id`: Get position details
- `POST /api/positions`: Create a new position
- `PUT /api/positions/:id/close`: Close a position

### Simulation Control

- `GET /api/simulation/status`: Get simulation status
- `POST /api/simulation/start`: Start the simulation
- `POST /api/simulation/stop`: Stop the simulation
- `POST /api/simulation/interval`: Update the simulation interval

## Real-time Events

- `prices:update`: Updated stock prices
- `stock:event`: Stock events (buffs/nerfs)
- `simulation:state`: Simulation state changes

## License

[MIT](LICENSE)