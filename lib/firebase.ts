import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBc6tiaffpt5wGsTEFuAtHHy8lue9U-rZI',
  authDomain: 'avigestao-cf5fe.firebaseapp.com',
  projectId: 'avigestao-cf5fe',
  storageBucket: 'avigestao-cf5fe.appspot.com',
  messagingSenderId: '160767646370',
  appId: '1:160767646370:web:436332d46c6fb1033055fb',
  measurementId: 'G-MXTVXKMBN7',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'southamerica-east1');
export const storage = getStorage(app);

// Função para capturar e tratar erros do Firebase
function handleFirebaseError(error: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Erro do Firebase:', error);
  } else {
    // Em produção, logar erros de forma mais discreta
    console.log('Ocorreu um erro. Por favor, tente novamente mais tarde.');
  }
}

// Exemplo de uso do interceptor para autenticação
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Usuário autenticado:', user.uid);
  } else {
    console.log('Usuário não autenticado.');
  }
}, handleFirebaseError);
