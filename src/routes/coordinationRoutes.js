import { Router } from 'express';
import coordinationController from '../controllers/coordinationController.js';

const router = Router();

router.get('/kpis', coordinationController.getKPIs);
router.get('/stats/regions', coordinationController.getStatsParRegion);
router.get('/stats/evolution/beneficiaires', coordinationController.getEvolutionBeneficiaires);
router.get('/stats/evolution/doublons', coordinationController.getEvolutionDoublons);
router.get('/alertes', coordinationController.getAlertes);
router.get('/organisations', coordinationController.getOrganisations);

export default router;
