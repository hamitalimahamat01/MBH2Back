import { Router } from 'express';
import axios from 'axios';
import { AuthService } from '../services/authService.js';

const router = Router();
const authService = new AuthService();

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });
  const decoded = authService.verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, message: 'Token invalide' });
  req.user = decoded;
  next();
};

router.post('/register', async (req, res) => {
  try {
    const { nom, nomComplet, type, pays, description, dateCreation, email, password } = req.body;
    if (!nom || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis' });
    }
    const result = await authService.register({ nom, nomComplet: nomComplet || nom, type, pays, description, dateCreation, email, password });
    res.json({ success: true, message: 'Inscription reussie', organisation: result.organisation, token: result.token });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

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

router.get('/verify', authenticate, async (req, res) => {
  try {
    const organisation = await authService.getOrganisationById(req.user.id);
    if (!organisation) return res.status(404).json({ success: false, message: 'Organisation non trouvee' });
    res.json({ success: true, organisation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { nom, nomComplet, type, pays, telephone, siteWeb, adresse, description } = req.body;
    res.json({ success: true, message: 'Profil mis a jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/organisations', authenticate, async (req, res) => {
  try {
    const organisations = await authService.getAllOrganisations();
    res.json({ success: true, organisations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Google OAuth Routes
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
  const frontendUrl = process.env.NODE_ENV === 'production' 
    ? 'https://mbh2front.onrender.com'
    : 'http://localhost:5173';
  
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
