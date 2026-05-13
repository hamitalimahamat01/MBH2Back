import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

async function updateTable() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 Mise à jour de la table beneficiaires...');

  // Renommer region en province si nécessaire
  try {
    await db.execute(`ALTER TABLE beneficiaires RENAME COLUMN region TO province`);
    console.log('✅ Colonne "region" renommée en "province"');
  } catch (e) {
    if (e.message.includes('no such column')) {
      console.log('⚠️ La colonne "region" n\'existe pas ou a déjà été renommée');
    } else if (e.message.includes('duplicate column name')) {
      console.log('⚠️ La colonne "province" existe déjà');
    }
  }

  // Ajouter la colonne ville
  try {
    await db.execute(`ALTER TABLE beneficiaires ADD COLUMN ville TEXT`);
    console.log('✅ Colonne "ville" ajoutée');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('⚠️ La colonne "ville" existe déjà');
    }
  }

  // Ajouter la colonne village_quartier
  try {
    await db.execute(`ALTER TABLE beneficiaires ADD COLUMN village_quartier TEXT`);
    console.log('✅ Colonne "village_quartier" ajoutée');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('⚠️ La colonne "village_quartier" existe déjà');
    }
  }

  // Vérifier la structure
  const result = await db.execute('PRAGMA table_info(beneficiaires)');
  console.log('\n📊 Structure de la table beneficiaires:');
  result.rows.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });

  process.exit(0);
}

updateTable().catch(console.error);
