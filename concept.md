# 🧠 Virtual Trading Game – Complete Project Description

## 🎯 Overview

The Virtual Trading Game is a **real-time, interactive stock market simulator** designed for engaging experiences like educational events, scout camps, or workshops. Participants use **play money** (e.g., Monopoly money) to buy and sell **virtual stocks** through a large interactive dashboard. The game combines simplicity and strategy by simulating stock behavior with supply, demand, and volatility while offering rich visuals and minimalistic controls.

---

## 🖥️ User Interface (Frontend)

### 🔧 Technologies
- **React** for building UI components
- **Tailwind CSS** with a **dark theme** aesthetic
- **Charts**: `recharts` or `chart.js` for rendering stock graphs
- State management via **Zustand** or **Redux**

### 📋 General Layout
- **Full-screen dashboard** with all stocks visible at once
- Uses **symbols and tooltips** instead of text where possible
- Minimalist design prioritizing **clarity, accessibility, and interactivity**

### 📈 Stock Display (Stock Tiles)
Each stock appears as a **card/tile** showing:
- **Stock name**
- **Uploaded icon**
- **Themed color**
- **Current price**
- **Mini price graph**
- **Symbols** representing state:
  - 📈 = trending up
  - 📉 = trending down
  - 🧲 = high demand
  - 🔧 = buff/nerf active
  - ⏳ = event pending

Participants see **at a glance**:
- What each stock is
- How it's performing
- Who is invested in it

### 👤 Participant/Player Overview
- Each player is created with a **name and custom icon**
- Players persist over time and can be selected again in future sessions
- Their **open positions** are shown as:
  - Small chips/icons on the stock tiles
  - Tooltip on hover with details: buy price, quantity, gain/loss, etc.
- A **search bar** lets you quickly find any user and open a **dialog** showing:
  - All open/closed positions
  - Ability to buy/sell
  - Overall gains/losses

---

## 💹 Stock Mechanics

### 🧪 Stock Creation
When creating a stock, define:
- **Name**
- **Icon** (uploadable image)
- **Theme color**
- **Volatility level** (Low, Medium, High)
- **Initial price**
- **Manual buff/nerf modifier**

### 🔄 Volatility Settings
Each stock has a **volatility coefficient** affecting how much it can change in price:
- **Low Volatility**: small gradual shifts over time (for long-term strategies)
- **High Volatility**: large, fast price swings (for short-term trades)

This allows different investment strategies:
- Quick trading
- Buy-and-hold tactics

### 🛠️ Price Simulation Engine
The stock prices change periodically based on:

```js
priceChange = baseVolatility 
            + demandImpact 
            + manualModifiers 
            + randomEventFactor
```

#### Factors:
- **Base Volatility**: inherent to each stock
- **Demand Impact**: driven by number/size of active positions
- **Manual Modifiers**: applied by admins as buffs or nerfs
- **Random Events**: optional triggers simulating real-world news

### ⏱️ Simulation Timing
- Prices update at an **adjustable interval** (e.g. every 1s, 5s, 10s)
- Controlled in real time through a panel (e.g. slider or dropdown)
- Can be **paused or accelerated** during the session

### ⚠️ Manual Events
Admins can trigger:
- Buffs/nerfs
- Labelled events (e.g. "📰 Earnings Beat +15%")
- Randomized market news

---

## 📦 Position Management

### ✅ Opening a Position
- Select stock
- Choose player (create or reuse)
- Input amount
- Position opens at current price

### ❌ Closing a Position
- From the player's dialog or stock tile
- Shows:
  - Buy price
  - Sell price
  - Net gain/loss
  - Time held

All activity is stored in the backend.

---

## 🏅 Leaderboards

### Per-Stock Position Leaderboard
Each stock has a built-in leaderboard that displays:
- Top-performing positions (by percentage or value)
- Player avatar, name, and P/L
- Sorted by profit or other metric

Not a global leaderboard — each stock has its own.

---

## 🧩 Backend System

### ⚙️ Technologies
- **SQLite** database
- Backend via **Express.js**, **FastAPI**, or **Node.js**
- REST or GraphQL API to:
  - Create/update stocks and users
  - Open/close positions
  - Fetch price history
  - Control simulation speed and events

### 🗃️ Database Schema
```txt
stocks (id, name, icon_url, color, volatility, base_value, buff_value, created_at)
users (id, name, icon_url, created_at)
positions (id, stock_id, user_id, amount, open_price, is_open, created_at, closed_at)
stock_history (id, stock_id, timestamp, price)
```

### 🔄 Persistence
- All stock and user data is stored in SQLite
- Game sessions can be paused/resumed
- Optional JSON import/export for saving snapshots

---

## 💵 Real-World Integration (Play Money)

### How It Works in a Physical Setting:
- Participants bring **Monopoly-style money** to a central stand
- Use it to buy stock positions in the game
- Later, return to **sell** and cash out based on the virtual performance
- Facilitators handle transactions and simulate payouts based on backend data

---

## ✅ Final Notes

This system creates an **engaging simulation environment** for educational or recreational settings, enabling teenagers and adults alike to:
- Learn market dynamics
- Compete in a gamified environment
- Explore strategic thinking through investment decisions

The design is **modular, customizable**, and focused on **user clarity with minimal input required**, allowing it to scale smoothly across different group sizes and event types.