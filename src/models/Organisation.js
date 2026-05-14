import { getDb } from '../database/sqlite.js';

export class Organisation {
  static async findByEmail(email) {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM organisations WHERE email = ?',
      args: [email]
    });
    return result.rows[0];
  }

  static async findByNom(nom) {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM organisations WHERE nom = ?',
      args: [nom]
    });
    return result.rows[0];
  }

  static async findById(id) {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, nom, nom_complet, type, pays, email, statut, beneficiaires_count, actions_count, 
                    created_at, telephone, site_web, adresse, description, date_creation, photo
             FROM organisations WHERE id = ?`,
      args: [id]
    });
    return result.rows[0];
  }

  static async findAll(onlyActive = true) {
    const db = getDb();
    let sql = `SELECT id, nom, nom_complet, type, pays, email, statut, beneficiaires_count, actions_count, photo
               FROM organisations`;
    if (onlyActive) {
      sql += " WHERE statut = 'ACTIVE'";
    }
    sql += ' ORDER BY nom';
    const result = await db.execute(sql);
    return result.rows;
  }

  static async create(data) {
    const db = getDb();
    const { id, nom, nomComplet, type, pays, description, dateCreation, email, hashedPassword } = data;
    
    await db.execute({
      sql: `INSERT INTO organisations 
            (id, nom, nom_complet, type, pays, description, date_creation, email, password, statut) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      args: [id, nom, nomComplet || nom, type || 'ONG', pays || 'Tchad', description || null, dateCreation || null, email, hashedPassword]
    });
    
    return this.findById(id);
  }

  static async updateBeneficiairesCount(id) {
    const db = getDb();
    await db.execute({
      sql: `UPDATE organisations SET beneficiaires_count = (
        SELECT COUNT(*) FROM beneficiaires WHERE organisation_id = ?
      ) WHERE id = ?`,
      args: [id, id]
    });
  }

  static async updateProfile(id, data) {
    const db = getDb();
    const fields = [];
    const values = [];
    
    const allowedFields = ['nom', 'nom_complet', 'type', 'pays', 'telephone', 'site_web', 'adresse', 'description', 'date_creation', 'photo'];
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    await db.execute({
      sql: `UPDATE organisations SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return this.findById(id);
  }
}

export default Organisation;
