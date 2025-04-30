# Virtual Trading Game - Frontend Documentation

## Overview

The frontend of the Virtual Trading Game is built with React, TypeScript, and Tailwind CSS. It provides a real-time, interactive interface for users to view stocks, make trades, and monitor market performance. The application follows a component-based architecture with Zustand for state management and WebSocket connectivity for real-time updates.

## Technologies Used

- **React**: Framework for building the user interface
- **TypeScript**: For type safety and improved developer experience
- **Tailwind CSS**: For styling with a custom dark theme
- **Recharts**: For rendering interactive stock charts
- **Zustand**: For state management
- **Axios**: For API requests
- **Socket.io-client**: For real-time communication

## Project Structure

```
client/
  ├── src/
  │   ├── components/       # UI components organized by feature
  │   │   ├── layout/       # Layout components (Admin, Modal, SimulationControl)
  │   │   ├── positions/    # Position-related components
  │   │   ├── stocks/       # Stock-related components
  │   │   └── users/        # User-related components
  │   ├── services/         # API and WebSocket services
  │   ├── store/            # State management with Zustand
  │   ├── types/            # TypeScript type definitions
  │   ├── App.tsx           # Main application component
  │   └── index.tsx         # Entry point
  └── public/               # Static assets
```

## Core Components

### App.tsx

The main application component that integrates all other components. It provides:
- Header with user selection and admin controls
- Layout grid for stock display and trading panel
- Modal integration for the admin panel

### Stock Components

#### StockGrid

Displays all stocks in a responsive grid layout. Features:
- Real-time price updates via WebSocket
- Click to view detailed stock information
- Socket connection management for live updates

#### StockCard

Individual card displaying stock information:
- Name, icon, and current price
- Price trend indicators (📈 or 📉)
- Mini chart showing recent performance
- Status indicators (e.g., 🧲 for high demand)
- Current positions by users

#### Stock

Detailed view of a specific stock showing:
- Historical price chart
- Stock information (base value, volatility, etc.)
- Market activity

#### StockForm

Form for creating and editing stocks with fields for:
- Stock name
- Base value
- Volatility level
- Theme color
- Buff/Nerf value
- Icon upload

### Position Components

#### PositionForm

Form for creating new positions (buying stocks):
- Stock selection
- Amount input
- Preview of purchase details
- Automatic price calculation

#### PositionList

Displays a user's positions with ability to:
- View open positions
- Close positions (sell stocks)
- See profit/loss calculations

### Layout Components

#### Modal

Reusable modal component with:
- Backdrop click to close
- Keyboard escape key support
- Customizable width
- Optional title section

#### SimulationControl

Controls for the stock market simulation:
- Start/stop simulation
- Adjust update interval
- Display current simulation status

#### Admin

Admin panel for managing the application:
- Stock management (create, edit, delete)
- Table view of all stocks with their properties
- Confirmation dialogs for destructive actions

### User Components

#### UserChip

Small component displaying user information:
- User icon
- Optional name display
- Tooltip with additional information
- Used in stock cards to show positions

## State Management

The application uses Zustand for state management, with separate stores for:

### stockStore

- `stocks`: Array of all stocks
- `loading`, `error`: State for API requests
- `fetchStocks()`: Loads all stocks
- `updateStockPrices()`: Updates prices from WebSocket
- `createStock()`, `updateStock()`, `deleteStock()`: CRUD operations

### userStore

- `users`: Array of all users
- `selectedUser`: Currently selected user
- `fetchUsers()`: Loads all users
- `selectUser()`: Updates the selected user

### positionStore

- `positions`: Array of user positions
- `fetchUserPositions()`: Loads positions for a user
- `createPosition()`: Opens a new position
- `closePosition()`: Closes an existing position
- `getPositionsForStock()`: Filters positions by stock

### simulationStore

- `isRunning`: Simulation status
- `updateInterval`: Time between updates
- `startSimulation()`, `stopSimulation()`: Control simulation
- `setUpdateInterval()`: Changes update frequency

## Services

### api.ts

Axios-based service for backend API communication:
- GET, POST, PUT, DELETE methods
- Type-safe request and response handling
- Endpoint organization by resource (stocks, users, positions)

### socket.ts

Socket.io client for real-time updates:
- Connection management
- Price update subscription
- Stock event handling

## Styling

The application uses Tailwind CSS with a custom dark theme optimized for:
- Clear visibility of stock information
- Color coding for price movements (green for up, red for down)
- Responsive design that works on different screen sizes
- Custom utilities for charts and interactive elements

## Real-time Features

- Live stock price updates through WebSockets
- Position updates reflected immediately across the UI
- Simulation controls for adjusting market behavior

## User Experience Considerations

- Tooltips provide additional information without cluttering the UI
- Color-coded indicators for quick visual assessment
- Modal dialogs for focused tasks
- Responsive grid adjusts based on screen size
- Confirmation for destructive actions

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Build for production:
   ```
   npm run build
   ```

## Best Practices

- Component-based architecture for reusability
- TypeScript for type safety and better IntelliSense
- Zustand for predictable state management
- Socket.io for efficient real-time updates
- Tailwind CSS for maintainable styling