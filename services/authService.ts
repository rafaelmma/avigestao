import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const AUTH_CONTINUE_URL =
  import.meta.env.VITE_AUTH_CONTINUE_URL || 'https://avigestao-cf5fe.firebaseapp.com';

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net';

const getActionCodeSettings = () => ({
  url: AUTH_CONTINUE_URL,
});

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: unknown) {
    return { user: null, error: getErrorMessage(error) };
  }
};

export const initializeNewUser = async (user: User, breederName?: string) => {
  try {
    const token = await user.getIdToken();
    const response = await fetch(`${FUNCTIONS_BASE_URL}/initializeNewUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.uid, breederName }),
    });

    if (!response.ok) {
      const message = await response.text();
      return { error: message || 'Falha ao inicializar usuario' };
    }

    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
};

export const signUp = async (email: string, password: string, breederName?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const initResult = await initializeNewUser(userCredential.user, breederName);
    let verificationError: string | null = null;
    try {
      await sendEmailVerification(userCredential.user, getActionCodeSettings());
    } catch (error: unknown) {
      verificationError = getErrorMessage(error);
    }
    return {
      user: userCredential.user,
      error: null,
      initError: initResult.error,
      verificationError,
    };
  } catch (error: unknown) {
    return { user: null, error: getErrorMessage(error), initError: null, verificationError: null };
  }
};

export const sendVerificationEmail = async (user?: User) => {
  try {
    const target = user ?? auth.currentUser;
    if (!target) {
      return { error: 'Nenhum usuario autenticado' };
    }
    await sendEmailVerification(target, getActionCodeSettings());
    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
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
