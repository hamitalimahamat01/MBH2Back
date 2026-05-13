import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Hash un NIN (Numéro d'Identité National)
 * Utilise SHA-256 pour anonymiser les données sensibles
 */
export function hashNIN(nin) {
  const salt = config.blockchain.salt;
  const hash = crypto.createHash(config.blockchain.hashAlgorithm);
  hash.update(salt + nin);
  return hash.digest('hex');
}

/**
 * Génère un identifiant unique formaté TCH-XXXX
 */
export function genererIdUnique() {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const timestamp = Date.now().toString().slice(-4);
  return `TCH-${random}-${timestamp}`;
}

/**
 * Vérifie si un hash correspond
 */
export function verifierHash(nin, hash) {
  return hashNIN(nin) === hash;
}

/**
 * Génère un hash simple pour compatibilité
 */
export function hashSimple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export default {
  hashNIN,
  genererIdUnique,
  verifierHash,
  hashSimple
};
