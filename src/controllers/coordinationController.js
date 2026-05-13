import KpiService from '../services/kpiService.js';
import Beneficiaire from '../models/Beneficiaire.js';
import Alerte from '../models/Alerte.js';
import Organisation from '../models/Organisation.js';

const kpiService = new KpiService();

export const coordinationController = {
  /**
   * Récupérer les KPIs
   */
  async getKPIs(req, res) {
    try {
      const kpis = await kpiService.getKPIs();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ total_beneficiaires: 0, total_alertes: 0 });
    }
  },

  /**
   * Récupérer les bénéficiaires par région
   */
  async getStatsParRegion(req, res) {
    try {
      const stats = await kpiService.getBeneficiairesParRegion();
      res.json(stats);
    } catch (error) {
      res.status(500).json([]);
    }
  },

  /**
   * Récupérer l'évolution des bénéficiaires
   */
  async getEvolutionBeneficiaires(req, res) {
    try {
      const evolution = await kpiService.getEvolutionBeneficiaires();
      res.json(evolution);
    } catch (error) {
      res.status(500).json({ labels: [], valeurs: [] });
    }
  },

  /**
   * Récupérer l'évolution des doublons
   */
  async getEvolutionDoublons(req, res) {
    try {
      const evolution = await kpiService.getEvolutionDoublons();
      res.json(evolution);
    } catch (error) {
      res.status(500).json({ labels: [], valeurs: [] });
    }
  },

  /**
   * Récupérer toutes les alertes
   */
  async getAlertes(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const alertes = await Alerte.findAll(limit);
      res.json(alertes);
    } catch (error) {
      res.status(500).json([]);
    }
  },

  /**
   * Récupérer toutes les organisations
   */
  async getOrganisations(req, res) {
    try {
      const organisations = await Organisation.findAll(true);
      res.json({ success: true, organisations });
    } catch (error) {
      res.status(500).json({ success: false, organisations: [] });
    }
  }
};

export default coordinationController;
