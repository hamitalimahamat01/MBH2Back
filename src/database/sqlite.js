import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

let db;

async function ensureColumns(db) {
  const columnsToAdd = [
    { name: 'profession', type: 'TEXT' },
    { name: 'etat_civil', type: 'TEXT' },
    { name: 'nb_enfants', type: 'INTEGER DEFAULT 0' },
    { name: 'arrondissement', type: 'TEXT' },
    { name: 'date_distribution', type: 'TEXT' },
    { name: 'province', type: 'TEXT' },
    { name: 'ville', type: 'TEXT' },
    { name: 'quantite', type: 'INTEGER DEFAULT 1' },
    { name: 'photo', type: 'TEXT' }
  ];
  
  console.log('🔧 Verification des colonnes...');
  
  for (const col of columnsToAdd) {
    try {
      await db.execute(`ALTER TABLE organisations ADD COLUMN ${col.name} ${col.type}`);
      console.log(`✅ Colonne ${col.name} ajoutee`);
    } catch (e) {
      if (e.message && e.message.includes('duplicate column name')) {
        console.log(`⚠️ Colonne ${col.name} existe deja`);
      }
    }
  }
}

export async function initializeDatabase() {
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Table des organisations
  await db.execute(`
    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY,
      nom TEXT UNIQUE,
      nom_complet TEXT,
      type TEXT,
      pays TEXT,
      description TEXT,
      date_creation TEXT,
      email TEXT UNIQUE,
      password TEXT,
      telephone TEXT,
      site_web TEXT,
      adresse TEXT,
      photo TEXT,
      statut TEXT DEFAULT 'ACTIVE',
      beneficiaires_count INTEGER DEFAULT 0,
      actions_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des bénéficiaires
  await db.execute(`
    CREATE TABLE IF NOT EXISTS beneficiaires (
      id TEXT PRIMARY KEY,
      identifiant_unique TEXT UNIQUE,
      nin_hash TEXT UNIQUE,
      nin_original TEXT,
      nom TEXT,
      prenom TEXT,
      sexe TEXT,
      age INTEGER,
      profession TEXT,
      etat_civil TEXT,
      nb_enfants INTEGER DEFAULT 0,
      province TEXT,
      ville TEXT,
      arrondissement TEXT,
      village_quartier TEXT,
      type_aide TEXT,
      quantite INTEGER DEFAULT 1,
      date_distribution TEXT,
      organisation_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    )
  `);

  // Table des alertes doublons
  await db.execute(`
    CREATE TABLE IF NOT EXISTS alertes (
      id TEXT PRIMARY KEY,
      tentative_nom TEXT,
      tentative_prenom TEXT,
      tentative_nin TEXT,
      organisation_source TEXT,
      organisation_existante TEXT,
      beneficiaire_existant_id TEXT,
      date_detection DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumns(db);

  const existingOrgs = await db.execute('SELECT COUNT(*) as count FROM organisations');
  
  if (existingOrgs.rows[0].count === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const testOrgs = [
      { id: 'org_wfp', nom: 'WFP', nomComplet: 'Programme Alimentaire Mondial', type: 'Agence ONU', pays: 'International', email: 'wfp@aidechain.org', telephone: '+235 XX XX XX XX', siteWeb: 'https://www.wfp.org', adresse: 'Rome, Italie' },
      { id: 'org_acf', nom: 'ACF', nomComplet: 'Action Contre la Faim', type: 'ONG Internationale', pays: 'France', email: 'acf@aidechain.org', telephone: '+235 XX XX XX XX', siteWeb: 'https://www.actioncontrelafaim.org', adresse: 'Paris, France' }
    ];
    
    for (const org of testOrgs) {
      await db.execute({
        sql: `INSERT INTO organisations (id, nom, nom_complet, type, pays, email, password, statut, telephone, site_web, adresse) VALUES 
        (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        args: [org.id, org.nom, org.nomComplet, org.type, org.pays, org.email, hashedPassword, org.telephone, org.siteWeb, org.adresse]
      });
    }
    
    console.log('✅ Organisations de test inserees');
  }

  console.log('✅ Base de donnees initialisee');
  return db;
}

export function getDb() {
  return db;
}
