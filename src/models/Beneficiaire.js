import { getDb } from '../database/sqlite.js';
import { hashNIN, genererIdUnique } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

export class Beneficiaire {
  static async findByNIN(nin) {
    const db = getDb();
    const ninHash = hashNIN(nin);
    
    const result = await db.execute({
      sql: `SELECT b.*, o.nom as organisation_nom 
            FROM beneficiaires b 
            LEFT JOIN organisations o ON b.organisation_id = o.id 
            WHERE b.nin_hash = ?`,
      args: [ninHash]
    });
    
    return result.rows[0];
  }

  static async findAll(options = {}) {
    const db = getDb();
    const { organisationId, limit, offset } = options;
    
    let sql = `SELECT b.*, o.nom as organisation_nom 
               FROM beneficiaires b 
               LEFT JOIN organisations o ON b.organisation_id = o.id`;
    const args = [];
    
    if (organisationId) {
      sql += ' WHERE b.organisation_id = ?';
      args.push(organisationId);
    }
    
    sql += ' ORDER BY b.created_at DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      args.push(limit);
    }
    if (offset) {
      sql += ' OFFSET ?';
      args.push(offset);
    }
    
    const result = await db.execute({ sql, args });
    return result.rows;
  }

  static async create(data) {
    const db = getDb();
    const id = uuidv4();
    const identifiantUnique = genererIdUnique();
    const ninHash = hashNIN(data.nin);
    
    await db.execute({
      sql: `INSERT INTO beneficiaires 
            (id, identifiant_unique, nin_hash, nin_original, nom, prenom, sexe, age, 
             profession, etat_civil, nb_enfants,
             province, ville, arrondissement, village_quartier, 
             type_aide, quantite, date_distribution, organisation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, identifiantUnique, ninHash, data.nin, data.nom, data.prenom, 
        data.sexe || '', data.age || null,
        data.profession || '', data.etatCivil || '', data.nbEnfants || 0,
        data.province, data.ville || '', data.arrondissement || '', data.villageQuartier || '',
        data.typeAide || 'ALIMENTAIRE', data.quantite || 1, data.dateDistribution || null,
        data.organisation_id
      ]
    });
    
    return this.findById(id);
  }

  static async findById(id) {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT b.*, o.nom as organisation_nom 
            FROM beneficiaires b 
            LEFT JOIN organisations o ON b.organisation_id = o.id 
            WHERE b.id = ?`,
      args: [id]
    });
    return result.rows[0];
  }

  static async getStatsByRegion() {
    const db = getDb();
    const totalResult = await db.execute('SELECT COUNT(*) as total FROM beneficiaires');
    const total = totalResult.rows[0]?.total || 1;
    
    const result = await db.execute(`
      SELECT province, COUNT(*) as count 
      FROM beneficiaires 
      WHERE province IS NOT NULL AND province != ''
      GROUP BY province 
      ORDER BY count DESC
    `);
    
    return result.rows.map(r => ({
      region: r.province,
      count: r.count,
      percent: (r.count / total) * 100
    }));
  }

  static async getEvolutionMensuelle() {
    const db = getDb();
    const result = await db.execute(`
      SELECT strftime('%Y-%m', created_at) as mois, COUNT(*) as count
      FROM beneficiaires
      WHERE created_at >= date('now', '-11 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY mois
    `);
    
    const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const valeurs = new Array(12).fill(0);
    
    result.rows.forEach(row => {
      const mois = new Date(row.mois + '-01').getMonth();
      valeurs[mois] = row.count;
    });
    
    return { labels, valeurs };
  }
}

export default Beneficiaire;
