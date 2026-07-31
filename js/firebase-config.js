/* ==========================================
   HABIT PRO - FIREBASE V10 SDK & DEMO ENGINE
   Supports Firebase Firestore + Auth with 
   seamless LocalStorage fallback for instant local testing!
   ========================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  deleteDoc, 
  updateDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Default / Configured Firebase Credentials
const getStoredFirebaseConfig = () => {
  const customConfig = localStorage.getItem('habit_pro_firebase_config');
  if (customConfig) {
    try { return JSON.parse(customConfig); } catch (e) { console.error('Invalid saved config', e); }
  }
  return {
    apiKey: "AIzaSyDR5anZs5fIwGhxSbG69FfLi-91Hs7a70E",
    authDomain: "audit-my-plan.firebaseapp.com",
    projectId: "audit-my-plan",
    storageBucket: "audit-my-plan.firebasestorage.app",
    messagingSenderId: "966629605516",
    appId: "1:966629605516:web:c07e23d07e22d431247ba9",
    measurementId: "G-LD97F1FMRP"
  };
};

let firebaseApp = null;
let auth = null;
let db = null;
let isFirebaseInitialized = false;

const config = getStoredFirebaseConfig();

// Attempt Firebase Initialization if credentials exist
if (config && config.apiKey && config.projectId) {
  try {
    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    isFirebaseInitialized = true;
    console.log("⚡ Firebase v10 SDK successfully initialized!");
  } catch (err) {
    console.warn("⚠️ Firebase Initialization Error. Falling back to Demo Engine:", err);
  }
} else {
  console.log("ℹ️ Running Habit Pro in Demo LocalStorage Engine mode.");
}

// Global Exported State & Config Helpers
export { auth, db, isFirebaseInitialized, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };

export function saveFirebaseConfig(newConfig) {
  localStorage.setItem('habit_pro_firebase_config', JSON.stringify(newConfig));
  window.location.reload();
}

export function getFirebaseStatus() {
  return isFirebaseInitialized ? 'connected' : 'demo';
}
