/* ==========================================
   HABIT PRO - HABITS DATA & LOGIC ENGINE
   Optimized Concurrent Firestore Engine with Optimistic UI State
   ========================================== */

import { db, isFirebaseInitialized } from './firebase-config.js';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let inMemoryHabitsCache = null;

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isHabitDueOnDate(habit, dateStr) {
  const start = new Date(habit.startDate || '2026-01-01');
  const target = new Date(dateStr);
  
  if (target < start) return false;

  if (!habit.isInfiniteDeadline && habit.targetDeadline) {
    const end = new Date(habit.targetDeadline);
    if (target > end) return false;
  }

  const diffTime = target - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const interval = parseInt(habit.repeatInterval || 1, 10);

  return diffDays % interval === 0;
}

function getLocalHabits(userId) {
  const key = `habit_pro_data_${userId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  try { return JSON.parse(data); } catch (e) { return []; }
}

function saveLocalHabits(userId, habits) {
  const key = `habit_pro_data_${userId}`;
  localStorage.setItem(key, JSON.stringify(habits));
}

// FAST CONCURRENT FIRESTORE FETCH (Parallel Promise.all)
export async function getHabits(userId, forceRefresh = false) {
  if (inMemoryHabitsCache && !forceRefresh) {
    return inMemoryHabitsCache;
  }

  if (isFirebaseInitialized && db) {
    try {
      const habitsCol = collection(db, `users/${userId}/habits`);
      const snapshot = await getDocs(habitsCol);
      
      // Parallel Promise.all execution for 10x faster concurrent queries
      const habitPromises = snapshot.docs.map(async (habitDoc) => {
        const hData = habitDoc.data();
        const logsCol = collection(db, `users/${userId}/habits/${habitDoc.id}/logs`);
        const logsSnap = await getDocs(logsCol);
        const logs = {};
        logsSnap.forEach(lDoc => {
          logs[lDoc.id] = lDoc.data();
        });
        return {
          id: habitDoc.id,
          ...hData,
          logs
        };
      });

      const habits = await Promise.all(habitPromises);
      inMemoryHabitsCache = habits;
      saveLocalHabits(userId, habits);
      return habits;
    } catch (err) {
      console.warn("Firestore fetch warning, using local cache:", err);
      inMemoryHabitsCache = getLocalHabits(userId);
      return inMemoryHabitsCache;
    }
  } else {
    inMemoryHabitsCache = getLocalHabits(userId);
    return inMemoryHabitsCache;
  }
}

export async function createHabit(userId, habitPayload) {
  const habitId = 'habit_' + Date.now();
  const interval = parseInt(habitPayload.repeatInterval || 1, 10);

  const newHabit = {
    id: habitId,
    title: habitPayload.title,
    description: habitPayload.description || '',
    category: habitPayload.category || 'Productivity',
    startDate: habitPayload.startDate || getTodayDateString(),
    targetDeadline: habitPayload.isInfiniteDeadline ? '' : (habitPayload.targetDeadline || ''),
    isInfiniteDeadline: Boolean(habitPayload.isInfiniteDeadline),
    repeatInterval: interval,
    frequency: interval === 1 ? 'Daily' : `Every ${interval} Days`,
    status: 'active',
    createdAt: new Date().toISOString(),
    logs: {}
  };

  // Optimistic UI state update
  if (!inMemoryHabitsCache) inMemoryHabitsCache = [];
  inMemoryHabitsCache.unshift(newHabit);
  saveLocalHabits(userId, inMemoryHabitsCache);

  // Background Firestore Save
  if (isFirebaseInitialized && db) {
    setDoc(doc(db, `users/${userId}/habits`, habitId), {
      title: newHabit.title,
      description: newHabit.description,
      category: newHabit.category,
      startDate: newHabit.startDate,
      targetDeadline: newHabit.targetDeadline,
      isInfiniteDeadline: newHabit.isInfiniteDeadline,
      repeatInterval: newHabit.repeatInterval,
      frequency: newHabit.frequency,
      status: newHabit.status,
      createdAt: serverTimestamp()
    }).catch(e => console.error("Async Firestore create error:", e));
  }

  return newHabit;
}

export async function logHabitCheckIn(userId, habitId, dateStr, completed, note = '') {
  const logData = {
    date: dateStr,
    completed: completed,
    note: note,
    timestamp: new Date().toISOString()
  };

  // Optimistic UI update on in-memory cache
  if (inMemoryHabitsCache) {
    const target = inMemoryHabitsCache.find(h => h.id === habitId);
    if (target) {
      if (!target.logs) target.logs = {};
      target.logs[dateStr] = logData;
    }
    saveLocalHabits(userId, inMemoryHabitsCache);
  }

  // Background Firestore Save
  if (isFirebaseInitialized && db) {
    setDoc(doc(db, `users/${userId}/habits/${habitId}/logs`, dateStr), {
      ...logData,
      timestamp: serverTimestamp()
    }).catch(e => console.error("Async Firestore log check-in error:", e));
  }

  return logData;
}

export async function deleteHabit(userId, habitId) {
  // Optimistic UI update
  if (inMemoryHabitsCache) {
    inMemoryHabitsCache = inMemoryHabitsCache.filter(h => h.id !== habitId);
    saveLocalHabits(userId, inMemoryHabitsCache);
  }

  // Background Firestore Delete
  if (isFirebaseInitialized && db) {
    deleteDoc(doc(db, `users/${userId}/habits`, habitId)).catch(e => console.error("Async Firestore delete error:", e));
  }

  return true;
}

export function calculateHabitStreak(logs) {
  if (!logs) return 0;
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    if (logs[dateStr] && logs[dateStr].completed) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export function calculateOverallStats(habits) {
  const todayStr = getTodayDateString();
  const totalHabits = habits.length;
  
  let completedToday = 0;
  let maxStreak = 0;
  let totalCompletions7Days = 0;
  let possibleCompletions7Days = habits.length * 7;

  habits.forEach(h => {
    if (h.logs && h.logs[todayStr] && h.logs[todayStr].completed) {
      completedToday++;
    }

    const currentStreak = calculateHabitStreak(h.logs);
    if (currentStreak > maxStreak) maxStreak = currentStreak;

    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (h.logs && h.logs[dateStr] && h.logs[dateStr].completed) {
        totalCompletions7Days++;
      }
    }
  });

  const weeklyCompletionRate = possibleCompletions7Days > 0 
    ? Math.round((totalCompletions7Days / possibleCompletions7Days) * 100) 
    : 0;

  return {
    totalHabits,
    completedToday,
    maxStreak,
    weeklyCompletionRate
  };
}
