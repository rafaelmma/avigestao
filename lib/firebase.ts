import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
export const storage = getStorage(app);
