import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // User is signed into Firebase Auth
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    
    // Attempt login with Google Provider
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Try with requested Gmail scopes
    try {
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
    } catch {
      // Scopes optional fallback
    }

    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (primaryErr: any) {
      // If scoped provider encountered internal-error or popup issues, retry with base Google provider
      if (primaryErr?.code === 'auth/internal-error' || primaryErr?.code === 'auth/invalid-oauth-provider') {
        const basicProvider = new GoogleAuthProvider();
        result = await signInWithPopup(auth, basicProvider);
      } else {
        throw primaryErr;
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.warn('Google sign-in attempt:', error?.code || error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

