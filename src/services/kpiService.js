import Beneficiaire from '../models/Beneficiaire.js';
import Alerte from '../models/Alerte.js';
import Organisation from '../models/Organisation.js';

export class KpiService {
  async getKPIs() {
    const [totalBeneficiaires, totalAlertes, totalOrganisations, beneficiairesParRegion, evolutionBeneficiaires] = await Promise.all([
      Beneficiaire.findAll().then(b => b.length),
      Alerte.findAll(1).then(a => a.length),
      Organisation.findAll(true).then(o => o.length),
      Beneficiaire.getStatsByRegion(),
      Beneficiaire.getEvolutionMensuelle()
    ]);
    
    // Calcul de la couverture moyenne
    const couvertureMoyenne = beneficiairesParRegion.length > 0
      ? Math.round(beneficiairesParRegion.reduce((sum, r) => sum + r.percent, 0) / beneficiairesParRegion.length)
      : 0;
    
    return {
      total_beneficiaires: totalBeneficiaires,
      total_alertes: totalAlertes,
      total_organisations: totalOrganisations,
      taux_couverture_moyen: Math.min(couvertureMoyenne, 100),
      beneficiaires_par_region: beneficiairesParRegion,
      evolution_beneficiaires: evolutionBeneficiaires,
      alertes_stats: await Alerte.getStats()
    };
  }

  async getBeneficiairesParRegion() {
    return Beneficiaire.getStatsByRegion();
  }

  async getEvolutionBeneficiaires() {
    return Beneficiaire.getEvolutionMensuelle();
  }

  async getEvolutionDoublons() {
    const stats = await Alerte.getStats();
    return stats.evolution;
  }
}

export default KpiService;
