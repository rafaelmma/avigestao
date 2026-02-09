import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1RyXxGMq-LBhKHe6pTlH0hqMSQQ5nIZI",
  authDomain: "avigestao-cf5fe.firebaseapp.com",
  projectId: "avigestao-cf5fe",
  storageBucket: "avigestao-cf5fe.appspot.com",
  messagingSenderId: "893968865267",
  appId: "1:893968865267:web:1b4c65b06c5eb8dd0f0d74"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixAdminUser() {
  try {
    console.log('🔍 Corrigindo usuário admin...\n');

    // ID do usuário que foi criado: UlrngZsnBjc8q9ZxOEt1BpCU4GH2
    const userId = 'UlrngZsnBjc8q9ZxOEt1BpCU4GH2';
    const userRef = doc(db, 'users', userId);

    // Verificar documento
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('❌ Usuário não encontrado!');
      return;
    }

    const userData = userDoc.data();
    console.log('📄 Dados atuais:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   isAdmin: ${userData.isAdmin}`);
    console.log(`   Plan: ${userData.plan}\n`);

    // Se não é admin, corrigir
    if (!userData.isAdmin) {
      console.log('🔧 Setando isAdmin = true...\n');
      
      await updateDoc(userRef, {
        isAdmin: true,
        updatedAt: Timestamp.now()
      });

      console.log('✅ CORRIGIDO! isAdmin está agora true\n');
    } else {
      console.log('✅ Usuário JÁ é admin! isAdmin está true\n');
    }

    console.log('═══════════════════════════════════════════');
    console.log('✅ TUDO PRONTO!\n');
    console.log('Próximas ações:');
    console.log('1. Deslogue completamente');
    console.log('2. Feche TODOS os navegadores');
    console.log('3. Abra uma NOVA janela anônima');
    console.log('4. Faça login novamente');
    console.log('5. O menu "Administração" deve aparecer!\n');
    console.log('═══════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

fixAdminUser();
