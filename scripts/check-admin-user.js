import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-key.json'), 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://avigestao-cf5fe.firebaseio.com'
  });

  const db = admin.firestore();

  async function checkAdminUser() {
    try {
      console.log('🔍 Verificando usuário admin...\n');
      
      // Buscar por email
      const usersSnapshot = await db.collection('users')
        .where('email', '==', 'avigestao@avigestao.com.br')
        .get();

      if (usersSnapshot.empty) {
        console.log('❌ Usuário NÃO encontrado no Firestore!');
        return;
      }

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log('✅ Usuário encontrado:\n');
        console.log(`   UID: ${doc.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   isAdmin: ${userData.isAdmin}`);
        console.log(`   isActive: ${userData.isActive}`);
        console.log(`   Plan: ${userData.plan}`);
        console.log(`   DisplayName: ${userData.displayName}\n`);

        if (!userData.isAdmin) {
          console.log('⚠️  PROBLEMA: isAdmin é false ou não existe!');
          console.log('   Corrigindo...\n');
        } else {
          console.log('✅ Campo isAdmin está CORRETO!');
        }
      });

      await admin.app().delete();
    } catch (error) {
      console.error('❌ Erro:', error.message);
      await admin.app().delete();
    }
  }

  checkAdminUser();
} catch (error) {
  console.error('❌ Erro ao carregar chave:', error.message);
}
