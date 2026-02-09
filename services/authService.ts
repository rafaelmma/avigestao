import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: unknown) {
    return { user: null, error: getErrorMessage(error) };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: unknown) {
    return { user: null, error: getErrorMessage(error) };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: false,
    });
    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
};

export const changePassword = async (newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: 'Nenhum usuário autenticado' };
    }
    await updatePassword(user, newPassword);
    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
};
