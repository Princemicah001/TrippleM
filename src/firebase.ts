import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)")
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth();

// Initialize anonymous authentication if not already signed in
export async function initializeAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
      console.log('Firebase anonymous session initiated:', auth.currentUser?.uid);
    }
  } catch (error) {
    console.warn('Firebase anonymous session could not be completed (this is expected if Auth is not turned on in your Console):', error);
  }
}
