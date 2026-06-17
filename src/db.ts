import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  getDocFromServer
} from 'firebase/firestore';
import { Business, Product, TeamMember, Transaction, AuditLog, LogEditRequest } from './types';
import { auth, db, initializeAuth } from './firebase';

// Operation Types for handling Firestore errors
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
  }
}

// Error handling helper in strict compliance with instructions
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Local cache keys
const KEYS = {
  BUSINESSES: 'tm_businesses',
  PRODUCTS: 'tm_products',
  TEAM: 'tm_team',
  TRANSACTIONS: 'tm_transactions',
  LOGS: 'tm_logs',
  EDIT_REQUESTS: 'tm_edit_requests',
};

// Memory cache
let cachedBusinesses: Business[] = [];
let cachedProducts: Product[] = [];
let cachedTeam: TeamMember[] = [];
let cachedTransactions: Transaction[] = [];
let cachedLogs: AuditLog[] = [];
let cachedEditRequests: LogEditRequest[] = [];

// Event listener registry
let changeListeners: (() => void)[] = [];

export function subscribeToDBChanges(listener: () => void) {
  changeListeners.push(listener);
  // Return cleanup function
  return () => {
    changeListeners = changeListeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  changeListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.error('Error executing DB listener:', e);
    }
  });
}

// Load cached items from LocalStorage for instant render fallback
function loadFromLocalStorage() {
  cachedBusinesses = JSON.parse(localStorage.getItem(KEYS.BUSINESSES) || '[]');
  cachedProducts = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
  cachedTeam = JSON.parse(localStorage.getItem(KEYS.TEAM) || '[]');
  cachedTransactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
  cachedLogs = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
  cachedEditRequests = JSON.parse(localStorage.getItem(KEYS.EDIT_REQUESTS) || '[]');
}

// Generic sync handler to propagate mutations to Firestore
async function syncCollectionToFirestore<T extends { id: string }>(
  collectionName: string,
  newData: T[]
) {
  try {
    await initializeAuth();
  } catch (error) {
    console.warn('Anonymous auth failed, attempting sync unauthenticated:', error);
  }

  try {
    // Upsert new/updated items (strictly non-destructive)
    for (const item of newData) {
      try {
        // Sanitize object to strip undefined fields which crashes Firestore SDK writes 
        const sanitizedItem = JSON.parse(JSON.stringify(item));
        await setDoc(doc(db, collectionName, item.id), sanitizedItem);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${item.id}`);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

// Explicit document deletion to prevent race condition bulk deletes
export async function deleteDocumentFromFirestore(collectionName: string, id: string) {
  try {
    await initializeAuth();
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// Validate connection on launch
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Initialization of Firestore connections & Realtime Synchronisation
export async function initDB() {
  loadFromLocalStorage();
  await testConnection();
  await initializeAuth();

  try {
    // 1. Connection check
    const bizSnapshot = await getDocs(collection(db, 'businesses'));
    if (bizSnapshot.empty) {
      console.log('Database empty! Ready to record real business logs.');
    }

    // 2. Setup Real-time Synchronizers for all 5 collections
    onSnapshot(collection(db, 'businesses'), (snap) => {
      cachedBusinesses = snap.docs.map(doc => doc.data() as Business);
      localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(cachedBusinesses));
      notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'businesses');
    });

    onSnapshot(collection(db, 'products'), (snap) => {
      cachedProducts = snap.docs.map(doc => doc.data() as Product);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(cachedProducts));
      notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    onSnapshot(collection(db, 'team'), (snap) => {
      cachedTeam = snap.docs.map(doc => doc.data() as TeamMember);
      localStorage.setItem(KEYS.TEAM, JSON.stringify(cachedTeam));
      notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'team');
    });

    onSnapshot(collection(db, 'transactions'), (snap) => {
      cachedTransactions = snap.docs.map(doc => doc.data() as Transaction);
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(cachedTransactions));
      notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    onSnapshot(collection(db, 'logs'), (snap) => {
      cachedLogs = snap.docs.map(doc => doc.data() as AuditLog);
      localStorage.setItem(KEYS.LOGS, JSON.stringify(cachedLogs));
      notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    onSnapshot(collection(db, 'edit_requests'), (snap) => {
      cachedEditRequests = snap.docs.map(doc => doc.data() as LogEditRequest);
      localStorage.setItem(KEYS.EDIT_REQUESTS, JSON.stringify(cachedEditRequests));
      notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'edit_requests');
    });

  } catch (err) {
    console.error('Failed to initialize or synchronize Firestore collections:', err);
  }
}

// Global synchronous getters reading from instantaneous memory cache
export function getBusinesses(): Business[] {
  if (cachedBusinesses.length === 0) {
    loadFromLocalStorage();
  }
  return cachedBusinesses || [];
}

export function saveBusinesses(businesses: Business[]) {
  cachedBusinesses = businesses;
  localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(businesses));
  notifyListeners();
  syncCollectionToFirestore('businesses', businesses);
}

export function getProducts(): Product[] {
  if (cachedProducts.length === 0) {
    loadFromLocalStorage();
  }
  return cachedProducts || [];
}

export function saveProducts(products: Product[]) {
  cachedProducts = products;
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  notifyListeners();
  syncCollectionToFirestore('products', products);
}

export function getTeam(): TeamMember[] {
  if (cachedTeam.length === 0) {
    loadFromLocalStorage();
  }
  return cachedTeam || [];
}

export function saveTeam(team: TeamMember[]) {
  cachedTeam = team;
  localStorage.setItem(KEYS.TEAM, JSON.stringify(team));
  notifyListeners();
  syncCollectionToFirestore('team', team);
}

export function getTransactions(): Transaction[] {
  if (cachedTransactions.length === 0) {
    loadFromLocalStorage();
  }
  return cachedTransactions;
}

export function saveTransactions(txs: Transaction[]) {
  cachedTransactions = txs;
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
  notifyListeners();
  syncCollectionToFirestore('transactions', txs);
}

export function getLogs(): AuditLog[] {
  if (cachedLogs.length === 0) {
    loadFromLocalStorage();
  }
  return cachedLogs;
}

export function saveLogs(logs: AuditLog[]) {
  cachedLogs = logs;
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  notifyListeners();
  syncCollectionToFirestore('logs', logs);
}

export function getEditRequests(): LogEditRequest[] {
  if (cachedEditRequests.length === 0) {
    loadFromLocalStorage();
  }
  return cachedEditRequests;
}

export function saveEditRequests(requests: LogEditRequest[]) {
  cachedEditRequests = requests;
  localStorage.setItem(KEYS.EDIT_REQUESTS, JSON.stringify(requests));
  notifyListeners();
  syncCollectionToFirestore('edit_requests', requests);
}

// Log actions dynamically
export function logAction(action: string, details: string, isAlert = false, bizId: string | null = null) {
  const logs = getLogs();
  const newLog: AuditLog = {
    id: generateId(),
    action,
    details,
    time: new Date().toISOString(),
    isAlert,
    bizId,
  };
  const updatedLogs = [newLog, ...logs];
  saveLogs(updatedLogs);
}
