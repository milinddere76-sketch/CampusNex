require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet: secure HTTP headers (CSP, XSS, clickjacking, MIME sniff protection)
app.use(helmet({
  contentSecurityPolicy: false, // disabled for inline scripts in SaaS portal HTML
  crossOriginEmbedderPolicy: false
}));

// CORS: allow same-origin + known production domains
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5000',
  'https://campusnex.fly.dev',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser requests (curl, mobile apps) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS policy: origin not allowed'));
  },
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter: 100 req/min globally
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in a moment.' }
});
app.use(globalLimiter);

// Stricter limiter on auth routes: 20 req/min (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 1 minute.' }
});

// ============================================================================
// STATIC FILES
// ============================================================================

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, '../saas_portal')));

// ============================================================================
// HEALTH CHECK (Fly.io probes)
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: db.isFallback() ? 'fallback' : 'postgres'
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Server status
app.get('/api-status', (req, res) => {
  res.json({
    success: true,
    message: 'CampusNex Core Multi-Tenant Server - Active',
    version: '2.0.0',
    fallbackDbActive: db.isFallback(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : (err.message || 'Server error encountered')
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

        const dbRes = await db.query(
          'INSERT INTO public.tenant_chat_messages (sender_id, receiver_id, message, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [userDetails?.userId || '44444444-4444-4444-4444-444444444444', receiverId, messageText, fileUrl || null]
        );
        const savedMsg = dbRes.rows[0];

        if (activeConnections.has(receiverId)) {
          const recipientWs = activeConnections.get(receiverId);
          if (recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({ type: 'CHAT_RECEIVE', message: savedMsg }));
          }
        }
        ws.send(JSON.stringify({ type: 'CHAT_SENT_CONFIRM', message: savedMsg }));
      }

      else if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }

    } catch (err) {
      console.error('WS Message processing error:', err.message);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to process message' }));
    }
  });

  ws.on('close', () => {
    if (userDetails) {
      activeConnections.delete(userDetails.userId);
      console.log(`🔌 WS Disconnected: User [${userDetails.userId}]`);
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

// GPS Live Bus Route Simulator
setInterval(() => {
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

  activeConnections.forEach((clientSocket) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(payload);
    }
  });
}, 4000);

// ============================================================================
// SERVER START & GRACEFUL SHUTDOWN
// ============================================================================
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================================`);
  console.log(`🚀 CAMPUSNEX BACKEND SERVER ACTIVE`);
  console.log(`📡 URL: http://0.0.0.0:${PORT}`);
  console.log(`🔒 Security: Helmet + Rate Limiting enabled`);
  console.log(`🔌 WebSockets: Enabled`);
  console.log(`🩺 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🎯 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================================`);
});

// Graceful shutdown on SIGTERM (Fly.io sends this before killing container)
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
  // Force exit after 10s if close hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
