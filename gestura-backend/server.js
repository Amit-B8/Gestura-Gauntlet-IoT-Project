const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

process.loadEnvFile();

const app = express();
app.use(cors());
app.use(express.json());

// Set up the HTTP server and WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your Next.js app to connect
    methods: ["GET", "POST"]
  }
});

let currentMode = 'passive';

// --- WEBSOCKET CONNECTION (Talks to React) ---
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
  
  // Send the current mode to the dashboard as soon as it loads
  socket.emit('modeUpdate', currentMode);

  // Listen for the dashboard clicking 'Active' or 'Passive'
  socket.on('setMode', (mode) => {
    currentMode = mode;
    console.log('Mode changed to:', mode);
    io.emit('modeUpdate', currentMode); // Update all connected screens
  });

  socket.on('disconnect', () => {
    console.log('Frontend disconnected');
  });
});

// --- HTTP ENDPOINT (Talks to Pico) ---
// The Pico will send a POST request here 50 times a second
app.post('/api/data', (req, res) => {
  const { x, y, z } = req.body;
  
  if (currentMode === 'passive') {
    // Blast the sensor data to the React dashboard instantly
    io.emit('sensorData', { x, y, z });
  }

  // Reply to the Pico with the current mode so it knows if it should display ACTIVE
  res.json({ mode: currentMode });
});

const PORT = process.env.port;
server.listen(PORT, () => {
  console.log(`Gestura Broker running on http://localhost:${PORT}`);
});