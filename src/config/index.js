import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Serveur
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Sécurité
  jwtSecret: process.env.JWT_SECRET || 'aidechain-secret-key-2024',
  jwtExpiry: '24h',
  bcryptRounds: 10,
  
  // Blockchain
  blockchain: {
    hashAlgorithm: 'sha256',
    salt: process.env.HASH_SALT || 'aidechain-salt-2024'
  },
  
  // CORS
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ],
  
  // Database
  turso: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  }
};

export default config;
