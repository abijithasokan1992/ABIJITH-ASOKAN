import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, 
  query, where, onSnapshot, getDocFromServer, serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, UserProfile, UserRole, AuditLog, AuditAction } from '../types';

export const app = initializeApp(firebaseConfig);
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
    role?: string | null;
  };
}

// Current active session reference for error telemetry
let currentActiveSession: AppUser | null = null;

export function setCurrentSessionContext(user: AppUser | null) {
  currentActiveSession = user;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentActiveSession?.uid,
      email: currentActiveSession?.email,
      role: currentActiveSession?.role
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

// ==========================================
// ENTERPRISE IDENTITY & SESSION MANAGEMENT
// (Firebase Auth fully decoupled)
// ==========================================

export const ENTERPRISE_USERS: Record<UserRole, AppUser> = {
  ADMIN: {
    uid: 'exec-admin-abijith-01',
    email: 'abijithasokan1992@gmail.com',
    displayName: 'Abijith Asokan',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    role: 'ADMIN',
    companyName: 'STREAMVISTA Global Distribution Inc.',
    emailVerified: true
  },
  BUYER: {
    uid: 'buyer-sarah-lin-02',
    email: 'buyer@globalacquisitions.com',
    displayName: 'Sarah Lin',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    role: 'BUYER',
    companyName: 'Netflix / Sky Cinema Acquisition Group',
    emailVerified: true
  },
  CONTENT_OWNER: {
    uid: 'owner-david-miller-03',
    email: 'studio@streamvista.com',
    displayName: 'David Miller',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    role: 'CONTENT_OWNER',
    companyName: 'Paramount / A24 Rights Catalogue',
    emailVerified: true
  }
};

const SESSION_STORAGE_KEY = 'streamvista_active_session_v1';

export const getStoredSession = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppUser;
      currentActiveSession = parsed;
      return parsed;
    }
  } catch (e) {
    console.warn('Could not read session from localStorage:', e);
  }
  // Default to verified executive session
  const defaultUser = ENTERPRISE_USERS.ADMIN;
  currentActiveSession = defaultUser;
  return defaultUser;
};

export const saveSession = (user: AppUser | null): void => {
  try {
    currentActiveSession = user;
    if (user) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Could not persist session to localStorage:', e);
  }
};

export const loginAsEnterpriseRole = (role: UserRole): AppUser => {
  const user = ENTERPRISE_USERS[role] || ENTERPRISE_USERS.ADMIN;
  saveSession(user);
  return user;
};

export const loginWithCustomUser = (displayName: string, email: string, role: UserRole, companyName?: string): AppUser => {
  const user: AppUser = {
    uid: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: email.trim() || 'operator@streamvista.com',
    displayName: displayName.trim() || 'Enterprise Operator',
    role,
    companyName: companyName || 'Global Content Licensor',
    photoURL: role === 'ADMIN' 
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
      : role === 'CONTENT_OWNER'
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    emailVerified: true
  };
  saveSession(user);
  return user;
};

export const logoutSession = (): void => {
  saveSession(null);
};

// Sync profile to Firestore collection
export const syncUserProfile = async (user: AppUser): Promise<void> => {
  const userPath = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL || null,
      role: user.role,
      companyName: user.companyName || '',
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Sync profile non-fatal notice:', err);
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
    console.warn('Get user profile non-fatal notice:', err);
    return null;
  }
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
  resourceType?: 'deal' | 'contract' | 'screener' | 'asset' | 'auth' | 'ai_tool';
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
