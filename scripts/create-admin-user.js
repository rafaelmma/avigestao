import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-key.json'), 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://avigestao-cf5fe.firebaseio.com'
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  try {
    console.log('📝 Criando usuário admin...\n');

    // 1. Criar usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email: 'avigestao@avigestao.com.br',
      password: '1q2w3e4r!Q@W#E$R',
      displayName: 'AviGestão Admin'
    });

    console.log('✅ Usuário criado no Firebase Auth');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}\n`);

    // 2. Criar documento de usuário no Firestore
    const userData = {
      email: 'avigestao@avigestao.com.br',
      displayName: 'AviGestão',
      isAdmin: true,
      isActive: true,
      plan: 'Profissional',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    console.log('✅ Documento de usuário criado no Firestore');
    console.log(`   Plan: Profissional`);
    console.log(`   Admin: Sim\n`);

    // 3. Criar documento de settings
    const settingsData = {
      breederName: 'AviGestão',
      plan: 'Profissional',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await db.collection('users').doc(userRecord.uid).collection('settings').doc('preferences').set(settingsData);

    console.log('✅ Documento de settings criado\n');

    // 4. Exibir resumo
    console.log('═══════════════════════════════════════════');
    console.log('🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!\n');
    console.log('📧 Email: avigestao@avigestao.com.br');
    console.log('🔐 Senha: 1q2w3e4r!Q@W#E$R');
    console.log(`🆔 UID: ${userRecord.uid}`);
    console.log('👑 Admin: Sim');
    console.log('💎 Plano: Profissional');
    console.log('═══════════════════════════════════════════\n');

    console.log('ℹ️  Próximas ações:');
    console.log('1. Faça login em: https://avigestao-cf5fe.web.app');
    console.log('2. Use email: avigestao@avigestao.com.br');
    console.log('3. Use senha: 1q2w3e4r!Q@W#E$R');
    console.log('4. Vá em "Administração" → "Gerenciar Usuários"');
    console.log('5. Recomendação: Mude a senha na primeira vez que logar\n');

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.error('\n⚠️  Este email já existe no Firebase!');
      console.error('   Se quer remover, acesse Firebase Console');
    }
  } finally {
    // Desconectar
    await admin.app().delete();
    process.exit(0);
  }
}

// Executar
createAdminUser();
