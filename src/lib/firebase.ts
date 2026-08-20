import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, 
  query, where, onSnapshot, getDocFromServer, serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole, AuditLog, AuditAction } from '../types';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Context:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Quick validation of Firestore connection
async function validateFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connectivity check: client is offline or starting up.');
    }
  }
}
validateFirestoreConnection();

let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
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
      if (primaryErr?.code === 'auth/internal-error' || primaryErr?.code === 'auth/invalid-oauth-provider') {
        const basicProvider = new GoogleAuthProvider();
        result = await signInWithPopup(auth, basicProvider);
      } else {
        throw primaryErr;
      }
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    
    // Auto sync user document in Firestore
    if (result.user) {
      try {
        const userDocRef = doc(db, 'users', result.user.uid);
        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || 'Google User',
          photoURL: result.user.photoURL || null,
          role: result.user.email?.includes('admin') || result.user.email?.includes('abijith') ? 'ADMIN' : 'BUYER',
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Initial user profile sync notice (non-fatal):', dbErr);
      }
    }

    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.warn('Google sign-in attempt notice:', error?.code || error?.message || error);
    throw error;
  }
};

export const syncUserProfile = async (user: User, role: UserRole = 'BUYER'): Promise<void> => {
  const userPath = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Google User',
      photoURL: user.photoURL || null,
      role: role,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userPath = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
 };

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Log a compliance action to the Firebase-backed 'audit_logs' collection.
 */
export const logAuditEvent = async (data: {
  action: AuditAction;
  userId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  details: string;
  resourceId?: string;
  resourceType?: 'deal' | 'contract' | 'screener' | 'asset' | 'auth';
  metadata?: Record<string, any>;
}): Promise<string> => {
  const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logPath = `audit_logs/${logId}`;
  const logEntry: AuditLog = {
    id: logId,
    action: data.action,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName,
    role: data.role,
    details: data.details,
    resourceId: data.resourceId || '',
    resourceType: data.resourceType,
    metadata: data.metadata || {},
    timestamp: Date.now()
  };

  try {
    const logDocRef = doc(db, 'audit_logs', logId);
    await setDoc(logDocRef, logEntry);
    return logId;
  } catch (err) {
    console.warn('Audit log write non-fatal warning:', err);
    // Don't break UI on background log write, but log formatted error
    return logId;
  }
};

/**
 * Subscribe in real-time to the 'audit_logs' collection
 */
export const subscribeAuditLogs = (onUpdate: (logs: AuditLog[]) => void) => {
  try {
    const logsCol = collection(db, 'audit_logs');
    return onSnapshot(logsCol, (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as AuditLog;
        logs.push(item);
      });
      // Sort newest first
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      onUpdate(logs);
    }, (error) => {
      console.warn('Audit logs snapshot listener warning:', error);
    });
  } catch (err) {
    console.warn('Failed to attach audit log listener:', err);
    return () => {};
  }
};

/**
 * Fallback fetch for audit logs
 */
export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const logPath = 'audit_logs';
  try {
    const logsCol = collection(db, 'audit_logs');
    const snapshot = await getDocs(logsCol);
    const logs: AuditLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as AuditLog);
    });
    logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return logs;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, logPath);
    return [];
  }
};



