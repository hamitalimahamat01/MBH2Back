import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

async function checkUsers() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('📊 Utilisateurs dans la base de données:');
  const result = await db.execute('SELECT id, nom, email, statut FROM organisations');
  console.log(`Total: ${result.rows.length}`);
  result.rows.forEach(user => {
    console.log(`   - ${user.nom} (${user.email}) - ${user.statut}`);
  });

  process.exit(0);
}

checkUsers().catch(console.error);
