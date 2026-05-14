import { Router } from 'express';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthService } from '../services/authService.js';
import { getDb } from '../database/sqlite.js';

const router = Router();
const authService = new AuthService();

// Configuration multer pour l'upload de photos
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporte'), false);
  }
};

const upload = multer({ 
  storage, 
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter
});

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });
  const decoded = authService.verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, message: 'Token invalide' });
  req.user = decoded;
  next();
};

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { nom, nomComplet, type, pays, description, dateCreation, email, password } = req.body;
    if (!nom || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis' });
    }
    const result = await authService.register({ 
      nom, 
      nomComplet: nomComplet || nom, 
      type, 
      pays, 
      description, 
      dateCreation, 
      email, 
      password 
    });
    res.json({ success: true, message: 'Inscription reussie', organisation: result.organisation, token: result.token });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    const result = await authService.login(email, password);
    res.json({ success: true, message: 'Connexion reussie', organisation: result.organisation, token: result.token });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

// Verification token
router.get('/verify', authenticate, async (req, res) => {
  try {
    const organisation = await authService.getOrganisationById(req.user.id);
    if (!organisation) return res.status(404).json({ success: false, message: 'Organisation non trouvee' });
    res.json({ success: true, organisation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mise a jour profil
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { nom, nomComplet, type, pays, telephone, siteWeb, adresse, description, dateCreation, photoUrl } = req.body;
    const db = getDb();
    
    await db.execute({
      sql: `UPDATE organisations SET 
        nom = COALESCE(?, nom),
        nom_complet = COALESCE(?, nom_complet),
        type = COALESCE(?, type),
        pays = COALESCE(?, pays),
        telephone = COALESCE(?, telephone),
        site_web = COALESCE(?, site_web),
        adresse = COALESCE(?, adresse),
        description = COALESCE(?, description),
        date_creation = COALESCE(?, date_creation),
        photo = COALESCE(?, photo)
      WHERE id = ?`,
      args: [nom, nomComplet, type, pays, telephone, siteWeb, adresse, description, dateCreation, photoUrl, req.user.id]
    });
    
    const updated = await authService.getOrganisationById(req.user.id);
    res.json({ success: true, message: 'Profil mis a jour', organisation: updated });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload photo de profil
router.post('/upload-photo', authenticate, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier uploade' });
    }
    
    const photoUrl = `/uploads/${req.file.filename}`;
    const db = getDb();
    
    await db.execute({
      sql: 'UPDATE organisations SET photo = ? WHERE id = ?',
      args: [photoUrl, req.user.id]
    });
    
    res.json({ success: true, message: 'Photo uploadee avec succes', url: photoUrl });
  } catch (error) {
    console.error('Erreur upload photo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Liste des organisations
router.get('/organisations', authenticate, async (req, res) => {
  try {
    const organisations = await authService.getAllOrganisations();
    res.json({ success: true, organisations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route pour recuperer les infos de l'organisation connectee
router.get('/me', authenticate, async (req, res) => {
  try {
    const organisation = await authService.getOrganisationById(req.user.id);
    if (!organisation) return res.status(404).json({ success: false, message: 'Organisation non trouvee' });
    res.json({ success: true, organisation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GOOGLE OAUTH ==========

router.get('/google', (req, res) => {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://mbh2.onrender.com/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback');
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
  res.redirect(googleAuthUrl);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://mbh2front.onrender.com'
      : 'http://localhost:5173');
  
  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }
  
  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://mbh2.onrender.com/api/auth/google/callback'
          : 'http://localhost:3000/api/auth/google/callback'),
      grant_type: 'authorization_code'
    });
    
    const { access_token } = tokenResponse.data;
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const { email, name } = userResponse.data;
    let organisation = await authService.findByEmail(email);
    
    if (!organisation) {
      organisation = await authService.register({
        nom: name || email.split('@')[0],
        nomComplet: name || email.split('@')[0],
        email: email,
        password: Math.random().toString(36) + Math.random().toString(36)
      });
    }
    
    const token = authService.generateToken(organisation);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(organisation))}`);
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
});

export default router;
