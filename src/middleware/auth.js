import AuthService from '../services/authService.js';

const authService = new AuthService();

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token manquant' });
  }
  
  const decoded = authService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
  
  req.user = decoded;
  next();
};

export const requireActive = (req, res, next) => {
  if (req.user?.statut !== 'ACTIVE') {
    return res.status(403).json({ success: false, message: 'Compte non actif' });
  }
  next();
};
