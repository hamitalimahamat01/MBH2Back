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

// Configuration CORS complète - Accepter toutes les origines pour le test
const allowedOrigins = [
  'https://mbh2front.onrender.com',
  'https://mbh2.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permettre les requêtes sans origine (comme les appels API directs)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('❌ Origine bloquée par CORS:', origin);
      callback(null, true); // Accepter temporairement toutes les origines pour test
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Socket.IO avec CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket']
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', beneficiaireRoutes);
app.use('/api', coordinationRoutes);

// Route de test CORS
app.options('*', cors());
app.get('/api/test-cors', (req, res) => {
  res.json({ message: 'CORS fonctionne!', timestamp: new Date().toISOString() });
});

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
  console.log(`🔌 Client connecté: ${socket.id}`);
  socket.emit('connected', { message: 'Connecté à AideChain WebSocket' });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client déconnecté: ${socket.id}`);
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
║   🚀 AideChain API - Équipe TD-02                         ║
║                                                           ║
║   📡 Serveur: https://mbh2.onrender.com                   ║
║   🔗 API: https://mbh2.onrender.com/api                   ║
║                                                           ║
║   ✅ CORS activé pour toutes les origines                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

start();
