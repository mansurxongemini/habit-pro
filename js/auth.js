/* ==========================================
   HABIT PRO - AUTHENTICATION MODULE
   Strict Google Auth Protection & Sign Out Routing
   ========================================== */

import { auth, isFirebaseInitialized, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

let currentUser = null;
const authStateListeners = [];

export function initAuth() {
  if (isFirebaseInitialized && auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = {
          uid: user.uid,
          displayName: user.displayName || 'Habit Master',
          email: user.email,
          photoURL: user.photoURL || '',
          isDemo: false
        };
        localStorage.setItem('habit_pro_user_session', JSON.stringify(currentUser));
      } else {
        currentUser = null;
        localStorage.removeItem('habit_pro_user_session');
      }
      notifyListeners();
      enforceRouteProtection();
    });
  } else {
    // Check saved session
    const saved = localStorage.getItem('habit_pro_user_session');
    if (saved) {
      try { currentUser = JSON.parse(saved); } catch (e) { currentUser = null; }
    } else {
      currentUser = null;
    }
    notifyListeners();
    enforceRouteProtection();
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function isAuthenticated() {
  return currentUser !== null && !currentUser.isDemo;
}

export function subscribeAuthState(callback) {
  authStateListeners.push(callback);
  if (currentUser) callback(currentUser);
}

function notifyListeners() {
  authStateListeners.forEach(cb => cb(currentUser));
  updateAuthUI();
}

// Redirect unauthenticated users away from protected pages (index.html, analys.html, habit.html)
export function enforceRouteProtection() {
  const currentPath = window.location.pathname.toLowerCase();
  const isProtectedPage = currentPath.endsWith('index.html') || 
                          currentPath.endsWith('analys.html') || 
                          currentPath.endsWith('habit.html') ||
                          (currentPath === '/' || currentPath.endsWith('/habit_pro/'));

  if (!currentUser && isProtectedPage && !currentPath.endsWith('main.html')) {
    console.log("🔒 Access denied. User not authenticated via Google. Redirecting to main.html landing page...");
    window.location.href = 'main.html';
  }
}

export async function loginWithGoogle() {
  if (isFirebaseInitialized && auth) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      currentUser = {
        uid: user.uid,
        displayName: user.displayName || 'Habit Master',
        email: user.email,
        photoURL: user.photoURL || '',
        isDemo: false
      };
      localStorage.setItem('habit_pro_user_session', JSON.stringify(currentUser));
      notifyListeners();
      return { success: true };
    } catch (err) {
      console.error('Google Sign-in Error:', err);
      return { success: false, error: err.message };
    }
  } else {
    // Demo sign-in simulation
    currentUser = {
      uid: 'google_user_demo_123',
      displayName: 'Mansurxon',
      email: 'mansurxonsecret@gmail.com',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      isDemo: false
    };
    localStorage.setItem('habit_pro_user_session', JSON.stringify(currentUser));
    notifyListeners();
    return { success: true };
  }
}

export async function logoutUser() {
  if (isFirebaseInitialized && auth) {
    await signOut(auth);
  }
  currentUser = null;
  localStorage.removeItem('habit_pro_user_session');
  notifyListeners();
  
  // Instantly redirect to Landing Page main.html
  window.location.href = 'main.html';
}

export function updateAuthUI() {
  const user = getCurrentUser();
  
  const avatarEl = document.getElementById('user-avatar');
  const greetingEl = document.getElementById('user-greeting');
  const authBtn = document.getElementById('auth-action-btn');
  const firebaseStatusBadge = document.getElementById('firebase-status-badge');

  if (avatarEl) {
    if (user && user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" class="avatar-inner" />`;
    } else if (user) {
      avatarEl.innerHTML = `<div class="avatar-inner">${user.displayName.charAt(0)}</div>`;
    } else {
      avatarEl.innerHTML = `<div class="avatar-inner">?</div>`;
    }
  }

  if (greetingEl) {
    greetingEl.textContent = user ? user.displayName.split(' ')[0] : 'Not Signed In';
  }

  if (authBtn) {
    if (user) {
      authBtn.className = 'btn btn-glass btn-sm icon-btn-ghost';
      authBtn.title = 'Sign Out';
      authBtn.innerHTML = `<i data-lucide="log-out" style="width: 16px; height: 16px;"></i>`;
      authBtn.onclick = logoutUser;
    } else {
      authBtn.className = 'btn btn-primary btn-sm';
      authBtn.innerHTML = `<span>Sign In</span>`;
      authBtn.onclick = async () => {
        const res = await loginWithGoogle();
        if (res.success) window.location.href = 'index.html';
      };
    }
    if (window.lucide) window.lucide.createIcons();
  }

  if (firebaseStatusBadge) {
    if (user && !user.isDemo) {
      firebaseStatusBadge.className = 'eyebrow-tag';
      firebaseStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      firebaseStatusBadge.style.color = '#34D399';
      firebaseStatusBadge.innerHTML = '';
    } else {
      firebaseStatusBadge.className = 'eyebrow-tag';
      firebaseStatusBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      firebaseStatusBadge.style.color = '#FBBF24';
      firebaseStatusBadge.innerHTML = '🔒 Sign In Required';
    }
  }
}
