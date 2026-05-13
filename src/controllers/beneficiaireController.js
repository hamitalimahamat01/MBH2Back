import Beneficiaire from '../models/Beneficiaire.js';
import Organisation from '../models/Organisation.js';
import { DoublonService } from '../services/doublonService.js';

const doublonService = new DoublonService();

export const PROVINCES = [
  "N'Djamena (Capitale)", "Ouaddaï", "Logone Occidental", "Logone Oriental",
  "Mayo-Kebbi Est", "Mayo-Kebbi Ouest", "Tandjilé", "Mandoul", "Moyen-Chari",
  "Salamat", "Hadjer-Lamis", "Chari-Baguirmi", "Guéra", "Batha", "Kanem",
  "Lac", "Borkou", "Ennedi Est", "Ennedi Ouest", "Tibesti", "Wadi Fira", "Sila", "Barh El Gazel"
];

export const beneficiaireController = {
  async verifier(req, res) {
    try {
      const { nin } = req.params;
      const result = await doublonService.verifierDoublon(nin);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async enregistrer(req, res) {
    const {
      nin, nom, prenom, sexe, age, profession, etatCivil, nbEnfants,
      province, ville, arrondissement, villageQuartier,
      typeAide, quantite, dateDistribution, organisation_id
    } = req.body;
    
    const io = req.app.get('io');
    
    if (!nin || !nom || !prenom || !province || !organisation_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tous les champs requis sont obligatoires (NIN, nom, prénom, province, organisation)' 
      });
    }
    
    try {
      const existing = await Beneficiaire.findByNIN(nin);
      
      if (existing) {
        const alerte = await doublonService.traiterDoublon({
          tentative: { nom, prenom, nin },
          existant: existing,
          organisationSource: organisation_id
        }, io);
        
        return res.status(409).json({
          success: false,
          message: 'DOUBLON DÉTECTÉ ! Cette personne a déjà reçu une aide',
          beneficiaireExistant: {
            id: existing.id,
            identifiant_unique: existing.identifiant_unique,
            nom: existing.nom,
            prenom: existing.prenom,
            organisation: existing.organisation_nom
          }
        });
      }
      
      const nouveauBeneficiaire = await Beneficiaire.create({
        nin, nom, prenom, sexe, age, profession, etatCivil, nbEnfants: nbEnfants || 0,
        province, ville, arrondissement, villageQuartier,
        typeAide, quantite: quantite || 1, dateDistribution,
        organisation_id
      });
      
      await Organisation.updateBeneficiairesCount(organisation_id);
      
      if (io) {
        io.emit('nouveau_beneficiaire', {
          message: `✅ Nouveau bénéficiaire enregistré : ${nom} ${prenom} (${province})`,
          beneficiaire: nouveauBeneficiaire
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Bénéficiaire enregistré avec succès',
        beneficiaire: nouveauBeneficiaire
      });
      
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  async getAll(req, res) {
    try {
      const { limit, org } = req.query;
      const beneficiaires = await Beneficiaire.findAll({
        organisationId: org,
        limit: limit ? parseInt(limit) : undefined
      });
      res.json(beneficiaires);
    } catch (error) {
      res.status(500).json([]);
    }
  },
  
  getProvinces: (req, res) => {
    res.json({ success: true, provinces: PROVINCES });
  }
};

export default beneficiaireController;
