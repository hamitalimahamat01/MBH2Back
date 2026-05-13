import { getDb } from '../database/sqlite.js';
import { v4 as uuidv4 } from 'uuid';

export class Alerte {
  /**
   * Crée une alerte de doublon
   */
  static async create(data) {
    const db = getDb();
    const id = uuidv4();
    
    await db.execute({
      sql: `INSERT INTO alertes 
            (id, tentative_nom, tentative_prenom, tentative_nin, 
             organisation_source, organisation_existante, beneficiaire_existant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, data.tentative_nom, data.tentative_prenom, data.tentative_nin,
        data.organisation_source, data.organisation_existante, data.beneficiaire_existant_id
      ]
    });
    
    return this.findById(id);
  }

  /**
   * Trouve une alerte par ID
   */
  static async findById(id) {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT a.*, o1.nom as source_nom, o2.nom as existante_nom,
                   b.identifiant_unique as beneficiaire_id
            FROM alertes a 
            LEFT JOIN organisations o1 ON a.organisation_source = o1.id 
            LEFT JOIN organisations o2 ON a.organisation_existante = o2.id
            LEFT JOIN beneficiaires b ON a.beneficiaire_existant_id = b.id
            WHERE a.id = ?`,
      args: [id]
    });
    return result.rows[0];
  }

  /**
   * Récupère toutes les alertes
   */
  static async findAll(limit = 100) {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT a.*, o1.nom as source_nom, o2.nom as existante_nom,
                   b.identifiant_unique as beneficiaire_id
            FROM alertes a 
            LEFT JOIN organisations o1 ON a.organisation_source = o1.id 
            LEFT JOIN organisations o2 ON a.organisation_existante = o2.id
            LEFT JOIN beneficiaires b ON a.beneficiaire_existant_id = b.id
            ORDER BY a.date_detection DESC 
            LIMIT ?`,
      args: [limit]
    });
    return result.rows;
  }

  /**
   * Récupère les statistiques des alertes
   */
  static async getStats() {
    const db = getDb();
    const result = await db.execute('SELECT COUNT(*) as count FROM alertes');
    const evolutionResult = await db.execute(`
      SELECT strftime('%Y-%m', date_detection) as mois, COUNT(*) as count
      FROM alertes
      WHERE date_detection >= date('now', '-11 months')
      GROUP BY strftime('%Y-%m', date_detection)
      ORDER BY mois
    `);
    
    const valeurs = new Array(12).fill(0);
    evolutionResult.rows.forEach(row => {
      const mois = new Date(row.mois + '-01').getMonth();
      valeurs[mois] = row.count;
    });
    
    return {
      total: result.rows[0]?.count || 0,
      evolution: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
        valeurs
      }
    };
  }
}

export default Alerte;
