import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 Migration de la base de données...');

  // Ajouter les colonnes manquantes
  const columns = [
    { name: 'profession', type: 'TEXT' },
    { name: 'etat_civil', type: 'TEXT' },
    { name: 'nb_enfants', type: 'INTEGER DEFAULT 0' },
    { name: 'arrondissement', type: 'TEXT' },
    { name: 'date_distribution', type: 'TEXT' },
    { name: 'ville', type: 'TEXT' }
  ];

  for (const col of columns) {
    try {
      await db.execute(`ALTER TABLE beneficiaires ADD COLUMN ${col.name} ${col.type}`);
      console.log(`✅ Colonne ${col.name} ajoutée`);
    } catch (e) {
      console.log(`⚠️ Colonne ${col.name} existe déjà ou erreur: ${e.message}`);
    }
  }

  // Vérifier la structure
  const result = await db.execute("PRAGMA table_info(beneficiaires)");
  console.log('\n📊 Structure finale de la table beneficiaires:');
  result.rows.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });

  process.exit(0);
}

migrate().catch(console.error);
