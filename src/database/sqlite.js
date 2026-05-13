import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

let db;

async function ensureColumns(db) {
  // Liste de toutes les colonnes à ajouter si elles n'existent pas
  const columnsToAdd = [
    { name: 'profession', type: 'TEXT' },
    { name: 'etat_civil', type: 'TEXT' },
    { name: 'nb_enfants', type: 'INTEGER DEFAULT 0' },
    { name: 'arrondissement', type: 'TEXT' },
    { name: 'date_distribution', type: 'TEXT' },
    { name: 'province', type: 'TEXT' },
    { name: 'ville', type: 'TEXT' },
    { name: 'quantite', type: 'INTEGER DEFAULT 1' }
  ];
  
  console.log('🔧 Verification des colonnes de la table beneficiaires...');
  
  for (const col of columnsToAdd) {
    try {
      await db.execute(`ALTER TABLE beneficiaires ADD COLUMN ${col.name} ${col.type}`);
      console.log(`✅ Colonne ${col.name} ajoutee avec succes`);
    } catch (e) {
      // La colonne existe déjà - c'est normal
      if (e.message && e.message.includes('duplicate column name')) {
        console.log(`⚠️ Colonne ${col.name} existe deja`);
      } else {
        console.log(`⚠️ Erreur pour ${col.name}: ${e.message}`);
      }
    }
  }
  
  // Vérifier la structure finale
  const result = await db.execute("PRAGMA table_info(beneficiaires)");
  console.log('\n📊 Structure finale de la table beneficiaires:');
  result.rows.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });
}

export async function initializeDatabase() {
  // Connexion à Turso
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
      statut TEXT DEFAULT 'ACTIVE',
      beneficiaires_count INTEGER DEFAULT 0,
      actions_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des bénéficiaires avec TOUTES les colonnes
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

  // Ajouter les colonnes manquantes si la table existait déjà
  await ensureColumns(db);

  // Insertion des organisations de test (uniquement si la table est vide)
  const existingOrgs = await db.execute('SELECT COUNT(*) as count FROM organisations');
  
  if (existingOrgs.rows[0].count === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const testOrgs = [
      { id: 'org_wfp', nom: 'WFP', nomComplet: 'Programme Alimentaire Mondial', type: 'Agence ONU', pays: 'International', email: 'wfp@aidechain.org', telephone: '+235 XX XX XX XX', siteWeb: 'https://www.wfp.org', adresse: 'Rome, Italie' },
      { id: 'org_acf', nom: 'ACF', nomComplet: 'Action Contre la Faim', type: 'ONG Internationale', pays: 'France', email: 'acf@aidechain.org', telephone: '+235 XX XX XX XX', siteWeb: 'https://www.actioncontrelafaim.org', adresse: 'Paris, France' },
      { id: 'org_unicef', nom: 'UNICEF', nomComplet: 'UNICEF - Fonds des Nations Unies', type: 'Agence ONU', pays: 'International', email: 'unicef@aidechain.org', telephone: '+235 XX XX XX XX', siteWeb: 'https://www.unicef.org', adresse: 'New York, USA' },
      { id: 'org_msf', nom: 'MSF', nomComplet: 'Medecins Sans Frontieres', type: 'ONG Internationale', pays: 'Suisse', email: 'msf@aidechain.org', telephone: '+235 XX XX XX XX', siteWeb: 'https://www.msf.org', adresse: 'Geneve, Suisse' }
    ];
    
    for (const org of testOrgs) {
      await db.execute({
        sql: `INSERT INTO organisations (id, nom, nom_complet, type, pays, email, password, statut, telephone, site_web, adresse) VALUES 
        (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        args: [org.id, org.nom, org.nomComplet, org.type, org.pays, org.email, hashedPassword, org.telephone, org.siteWeb, org.adresse]
      });
    }
    
    console.log('✅ Organisations de test inserees dans Turso');
  }

  console.log('✅ Base de donnees Turso initialisee');
  return db;
}

export function getDb() {
  return db;
}
