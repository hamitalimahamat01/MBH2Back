import Beneficiaire from '../models/Beneficiaire.js';
import Alerte from '../models/Alerte.js';

export class DoublonService {
  /**
   * Vérifie si un bénéficiaire existe déjà
   */
  async verifierDoublon(nin) {
    const existing = await Beneficiaire.findByNIN(nin);
    return {
      estDoublon: !!existing,
      beneficiaire: existing ? {
        id: existing.id,
        identifiant_unique: existing.identifiant_unique,
        nom: existing.nom,
        prenom: existing.prenom,
        organisation: existing.organisation_nom
      } : null
    };
  }

  /**
   * Traite une tentative d'enregistrement en doublon
   */
  async traiterDoublon(doublonData, io) {
    const { tentative, existant, organisationSource } = doublonData;
    
    // Créer l'alerte
    const alerte = await Alerte.create({
      tentative_nom: tentative.nom,
      tentative_prenom: tentative.prenom,
      tentative_nin: tentative.nin,
      organisation_source: organisationSource,
      organisation_existante: existant.organisation_id,
      beneficiaire_existant_id: existant.id
    });
    
    // Notifier via WebSocket
    if (io) {
      io.emit('doublon_detecte', {
        message: `🚨 DOUBLON DÉTECTÉ ! ${tentative.nom} ${tentative.prenom} est déjà aidé par ${existant.organisation_nom}`,
        beneficiaireExistant: {
          id: existant.id,
          identifiant_unique: existant.identifiant_unique,
          nom: existant.nom,
          prenom: existant.prenom,
          organisation: existant.organisation_nom
        }
      });
    }
    
    return alerte;
  }
}

export default DoublonService;
