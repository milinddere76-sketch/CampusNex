require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

// Route Modules
const authRoutes = require('./routes/auth');
const collegeRoutes = require('./routes/colleges');
const attendanceRoutes = require('./routes/attendance');
const feeRoutes = require('./routes/fees');
const syncRoutes = require('./routes/sync');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CampusNex Core Multi-Tenant Server - Active',
    version: '1.0.0',
    fallbackDbActive: db.isFallback()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error encountered',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// WEBSOCKETS SERVER (REAL-TIME CHAT & GPS DRIVER ROUTE BROADCASTS)
// ============================================================================
const wss = new WebSocket.Server({ server });

// Map to track active client socket connections by User ID
const activeConnections = new Map();

wss.on('connection', (ws) => {
  console.log('🔌 New WS Connection established.');
  let userDetails = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // 1. Connection registration
      if (data.type === 'REGISTER') {
        userDetails = { userId: data.userId, role: data.role };
        activeConnections.set(data.userId, ws);
        console.log(`👤 WS Registered: User [${data.userId}] (${data.role})`);
        
        ws.send(JSON.stringify({ type: 'REGISTERED', success: true }));
      }
      
      // 2. Chat messaging handling
      else if (data.type === 'CHAT_MESSAGE') {
        const { receiverId, messageText, fileUrl } = data;
        
        console.log(`💬 WS Chat: ${userDetails?.userId} -> ${receiverId}: "${messageText}"`);

        // Record in Database
        const dbRes = await db.query(
          'INSERT INTO public.tenant_chat_messages (sender_id, receiver_id, message, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [userDetails?.userId || '44444444-4444-4444-4444-444444444444', receiverId, messageText, fileUrl || null]
        );

        const savedMsg = dbRes.rows[0];

        // Relay if recipient is online
        if (activeConnections.has(receiverId)) {
          const recipientWs = activeConnections.get(receiverId);
          if (recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'CHAT_RECEIVE',
              message: savedMsg
            }));
          }
        }

        // Echo back confirmation to sender
        ws.send(JSON.stringify({
          type: 'CHAT_SENT_CONFIRM',
          message: savedMsg
        }));
      }

      // 3. General Ping/Pong
      else if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }

    } catch (err) {
      console.error('WS Message processing error:', err);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to process message' }));
    }
  });

  ws.on('close', () => {
    if (userDetails) {
      activeConnections.delete(userDetails.userId);
      console.log(`🔌 WS Disconnected: User [${userDetails.userId}]`);
    }
  });
});

// GPS Live Bus Route Simulator: periodically updates location parameters
setInterval(() => {
  // Center: New York coordinates, Mr. Jerry Nelson bus 1
  const time = Date.now() / 10000;
  const simulatedLat = 40.7128 + 0.005 * Math.sin(time);
  const simulatedLng = -74.0060 + 0.005 * Math.cos(time);

  const payload = JSON.stringify({
    type: 'GPS_UPDATE',
    busId: 1,
    busNumber: 'NY-72B-9102',
    latitude: parseFloat(simulatedLat.toFixed(6)),
    longitude: parseFloat(simulatedLng.toFixed(6)),
    driverName: 'Mr. Jerry Nelson',
    driverPhone: '+1 (555) 012-9844'
  });

  // Broadcast to all active student or parent websocket connections
  activeConnections.forEach((clientSocket) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(payload);
    }
  });

}, 4000);

// Start listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================================`);
  console.log(`🚀 CAMPUSNEX BACKEND SERVER ACTIVE`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔌 WebSockets: Enabled`);
  console.log(`🎯 Default Subdomain: http://localhost:${PORT}/api/colleges/subdomain/apex`);
  console.log(`====================================================================`);
});
