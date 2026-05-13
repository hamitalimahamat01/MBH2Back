import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/sqlite.js';
import beneficiaireRoutes from './routes/beneficiaireRoutes.js';
import authRoutes from './routes/authRoutes.js';
import coordinationRoutes from './routes/coordinationRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configuration CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://mbh2front.onrender.com', 'https://mbh2.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://mbh2front.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Logger
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', beneficiaireRoutes);
app.use('/api', coordinationRoutes);

// Routes de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'AideChain API fonctionne' });
});

app.get('/', (req, res) => {
  res.json({
    name: 'AideChain API',
    version: '2.0.0',
    endpoints: ['/api/auth/*', '/api/kpis', '/api/beneficiaires', '/api/enregistrer']
  });
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connecte: ${socket.id}`);
  socket.emit('connected', { message: 'Connecte a AideChain WebSocket' });
  socket.on('disconnect', () => {
    console.log(`🔌 Client deconnecte: ${socket.id}`);
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 AideChain API - Equipe TD-02                         ║
║                                                           ║
║   📡 Serveur: http://localhost:${PORT}                      ║
║   🔗 API: http://localhost:${PORT}/api                      ║
║   🔐 Auth: http://localhost:${PORT}/api/auth                ║
║   🔌 WebSocket: ws://localhost:${PORT}                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Erreur au demarrage:', error);
    process.exit(1);
  }
}

start();
