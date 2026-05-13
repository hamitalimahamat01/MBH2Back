import { Router } from 'express';
import beneficiaireController, { PROVINCES } from '../controllers/beneficiaireController.js';

const router = Router();

// Route pour obtenir la liste des provinces
router.get('/provinces', (req, res) => {
  res.json({ success: true, provinces: PROVINCES });
});

router.get('/beneficiaires', beneficiaireController.getAll);
router.get('/verifier/:nin', beneficiaireController.verifier);
router.post('/enregistrer', beneficiaireController.enregistrer);

export default router;
