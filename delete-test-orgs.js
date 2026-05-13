import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

async function deleteTestOrganisations() {
  console.log('🔍 Connexion à Turso...');
  console.log('URL:', process.env.TURSO_DATABASE_URL ? '✅ Défini' : '❌ Manquant');
  
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('📊 Avant suppression...');
  const before = await db.execute('SELECT id, nom, email, statut FROM organisations');
  console.log(`Organisations trouvées: ${before.rows.length}`);
  before.rows.forEach(org => console.log(`   - ${org.nom}`));

  // Supprimer les organisations de test
  const testOrgs = ['WFP', 'ACF', 'UNICEF', 'MSF', 'TD-03'];
  console.log('\n🗑️ Suppression des organisations de test...');
  
  for (const org of testOrgs) {
    try {
      await db.execute('DELETE FROM organisations WHERE nom = ?', [org]);
      console.log(`   ✅ Supprimé: ${org}`);
    } catch (e) {
      console.log(`   ⚠️ ${org}: ${e.message}`);
    }
  }

  console.log('\n📊 Après suppression...');
  const after = await db.execute('SELECT id, nom, email FROM organisations');
  console.log(`Organisations restantes: ${after.rows.length}`);
  after.rows.forEach(org => console.log(`   - ${org.nom}`));

  process.exit(0);
}

deleteTestOrganisations().catch(console.error);
