const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const stockRoutes = require('./routes/stockRoutes');
const userRoutes = require('./routes/userRoutes');
const positionRoutes = require('./routes/positionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Import simulation engine
const SimulationEngine = require('./utils/simulationEngine');
const Settings = require('./models/Settings');

// Import socket utility module
const socketUtil = require('./utils/socket');

// Import database setup
const { setupDatabase } = require('./utils/setupDatabase');
// Setup database
setupDatabase();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Set the io instance in our socket utility module
socketUtil.setIo(io);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Initialize simulation engine
const simulation = new SimulationEngine(io);

// API routes
app.use('/api/stocks', stockRoutes);
app.use('/api/users', userRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/settings', settingsRoutes);

// Simulation control routes
app.post('/api/simulation/start', (req, res) => {
    simulation.start();
    res.json({ message: 'Simulation started', status: simulation.getStatus() });
});

app.post('/api/simulation/stop', (req, res) => {
    simulation.stop();
    res.json({ message: 'Simulation stopped', status: simulation.getStatus() });
});

app.post('/api/simulation/interval', (req, res) => {
    const { interval } = req.body;

    if (!interval || isNaN(interval)) {
        return res.status(400).json({ error: 'Valid interval is required' });
    }

    simulation.updateInterval(parseInt(interval, 10));
    res.json({ message: `Simulation interval updated to ${interval}ms`, status: simulation.getStatus() });
});

app.get('/api/simulation/status', (req, res) => {
    res.json(simulation.getStatus());
});

// Manual stock events
app.post('/api/stocks/:id/event', (req, res) => {
    const { id } = req.params;
    const { value, message } = req.body;

    if (value === undefined || isNaN(value)) {
        return res.status(400).json({ error: 'Valid value is required' });
    }

    simulation.applyManualEvent(id, parseFloat(value), message);
    res.json({ message: `Event applied to stock ID ${id}` });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io events
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Auto-start simulation if it was active before
    const simulationActive = Settings.get('simulation_active');
    if (simulationActive === 'true') {
        simulation.start();
    }
});