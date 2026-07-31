/* ==========================================
   HABIT PRO - MAIN UI CONTROLLER & EVENT GLUE
   ========================================== */

import { initAuth, getCurrentUser, subscribeAuthState, loginWithGoogle, enforceRouteProtection } from './auth.js';
import { 
  getHabits, createHabit, logHabitCheckIn, deleteHabit, 
  calculateOverallStats, calculateHabitStreak, getTodayDateString 
} from './habits.js';
import { 
  renderCompletionTrendChart, renderCategoryDoughnutChart, renderStreakHeatmap 
} from './charts.js';
import { generateAIAnalysis, saveAIConfig, getOpenRouterKey, getCustomAIModel, loadAIConfigFromFirestore } from './ai-analyzer.js';

let currentHabits = [];
let activeCategoryFilter = 'all';

// Global Google Sign-In Trigger for Landing Page & Header
window.triggerGoogleLogin = async function() {
  const res = await loginWithGoogle();
  if (res.success) {
    window.location.href = 'index.html';
  }
};

// Initialize Application & Enforce Authentication Route Protection
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  
  const heroAuthBtn = document.getElementById('hero-auth-btn');
  if (heroAuthBtn) {
    heroAuthBtn.onclick = async () => {
      await window.triggerGoogleLogin();
    };
  }

  subscribeAuthState(async (user) => {
    if (user) {
      await loadAIConfigFromFirestore(user.uid);
      loadUserDashboard();
    } else {
      enforceRouteProtection();
    }
  });
  
  setupModalListeners();
  setupAccessibilityModalListeners();
});

// Load Data & Render Views
async function loadUserDashboard() {
  const user = getCurrentUser();
  if (!user) {
    enforceRouteProtection();
    return;
  }

  currentHabits = await getHabits(user.uid);

  if (document.getElementById('habits-feed-container')) {
    renderDashboardUI();
  }

  if (document.getElementById('completion-chart-canvas')) {
    renderAnalyticsUI();
  }
}

/* ==========================================
   DASHBOARD RENDERER
   ========================================== */
function renderDashboardUI() {
  const habitsContainer = document.getElementById('habits-feed-container');
  const stats = calculateOverallStats(currentHabits);

  const totalHabitsEl = document.getElementById('stat-total-habits');
  const completedTodayEl = document.getElementById('stat-completed-today');
  const maxStreakEl = document.getElementById('stat-max-streak');
  const weeklyRateEl = document.getElementById('stat-weekly-rate');
  const streakHeaderEl = document.getElementById('header-streak-count');

  if (totalHabitsEl) totalHabitsEl.textContent = stats.totalHabits;
  if (completedTodayEl) completedTodayEl.textContent = `${stats.completedToday} / ${stats.totalHabits}`;
  if (maxStreakEl) maxStreakEl.textContent = `${stats.maxStreak} Days`;
  if (weeklyRateEl) weeklyRateEl.textContent = `${stats.weeklyCompletionRate}%`;
  if (streakHeaderEl) streakHeaderEl.textContent = `${stats.maxStreak}🔥`;

  const filtered = currentHabits.filter(h => {
    if (activeCategoryFilter === 'all') return true;
    return (h.category || '').toLowerCase() === activeCategoryFilter.toLowerCase();
  });

  if (!habitsContainer) return;

  if (filtered.length === 0) {
    habitsContainer.innerHTML = `
      <div class="card-outer" style="grid-column: 1 / -1;">
        <div class="card-inner" style="text-align: center; padding: 48px 24px;">
          <h3 style="margin-bottom: 8px;">No Habits Found</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Start building your daily routines by creating a habit.</p>
          <button class="btn btn-primary" onclick="window.openCreateHabitModal()">
            <span>+ Create First Habit</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  const todayStr = getTodayDateString();

  habitsContainer.innerHTML = filtered.map(habit => {
    const isCompletedToday = habit.logs && habit.logs[todayStr] && habit.logs[todayStr].completed;
    const streak = calculateHabitStreak(habit.logs);
    const interval = parseInt(habit.repeatInterval || 1, 10);

    let deadlineText = 'No deadline';
    if (habit.isInfiniteDeadline) {
      deadlineText = '♾️ Infinite';
    } else if (habit.targetDeadline) {
      const diffTime = new Date(habit.targetDeadline) - new Date();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      deadlineText = diffDays > 0 ? `${diffDays} days left` : 'Deadline reached';
    }

    const catClass = `cat-${(habit.category || 'productivity').toLowerCase()}`;

    return `
      <div class="card-outer ${isCompletedToday ? 'card-glow-success' : 'card-glow-primary'} animate-slide-up">
        <div class="card-inner">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="category-badge ${catClass}">${habit.category}</span>
              ${interval > 1 ? `<span class="category-badge cat-custom">🔄 Every ${interval} Days</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="streak-pill" style="font-size: 11px; padding: 2px 8px;">${streak}🔥</span>
              <button class="btn-glass btn-sm" style="padding: 4px 8px; border-radius: 8px;" onclick="window.deleteHabitPrompt('${habit.id}')" title="Delete Habit">✕</button>
            </div>
          </div>

          <a href="habit.html?id=${habit.id}" style="text-decoration: none; color: inherit;">
            <h3 style="margin-bottom: 6px;">${escapeHtml(habit.title)} ↗</h3>
          </a>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; flex: 1;">${escapeHtml(habit.description)}</p>

          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-subtle); margin-bottom: 6px;">
              <span>Started: ${habit.startDate || '2026-07-01'}</span>
              <span>${deadlineText}</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${isCompletedToday ? '100%' : '55%'};"></div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; margin-top: auto;">
            <button 
              class="btn ${isCompletedToday ? 'btn-success' : 'btn-primary'} completion-burst" 
              style="flex: 1;" 
              onclick="window.toggleCheckIn('${habit.id}', ${!isCompletedToday})"
            >
              <span>${isCompletedToday ? '✓ Completed Today' : 'Mark Complete'}</span>
            </button>
            
            <a 
              href="habit.html?id=${habit.id}"
              class="btn btn-glass" 
              style="padding: 10px; text-decoration: none;" 
              title="Daily Reflection Notes in Detail View"
            >
              📝
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnalyticsUI() {
  renderCompletionTrendChart('completion-chart-canvas', currentHabits, 7);
  renderCategoryDoughnutChart('category-chart-canvas', currentHabits);
  renderStreakHeatmap('streak-heatmap-container', currentHabits);
}

window.filterCategory = function(cat, btnElement) {
  activeCategoryFilter = cat;
  document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active', 'btn-primary'));
  btnElement.classList.add('active', 'btn-primary');
  renderDashboardUI();
};

window.toggleCheckIn = async function(habitId, completed) {
  const user = getCurrentUser();
  if (!user) {
    enforceRouteProtection();
    return;
  }
  const todayStr = getTodayDateString();

  await logHabitCheckIn(user.uid, habitId, todayStr, completed);
  currentHabits = await getHabits(user.uid);
  renderDashboardUI();

  if (completed) {
    triggerConfetti();
    showToast('🎉 Habit completed! Streak updated!', 'success');
  } else {
    showToast('Check-in status updated', 'info');
  }
};

window.deleteHabitPrompt = async function(habitId) {
  if (confirm('Are you sure you want to delete this habit?')) {
    const user = getCurrentUser();
    if (!user) {
      enforceRouteProtection();
      return;
    }
    await deleteHabit(user.uid, habitId);
    currentHabits = await getHabits(user.uid);
    renderDashboardUI();
    showToast('Habit deleted', 'info');
  }
};

window.openCreateHabitModal = function() {
  const modal = document.getElementById('create-habit-modal');
  const startDateInput = document.getElementById('habit-start-date');
  if (startDateInput && !startDateInput.value) {
    startDateInput.value = getTodayDateString();
  }
  if (modal) modal.classList.add('active');
};

window.closeCreateHabitModal = function() {
  const modal = document.getElementById('create-habit-modal');
  if (modal) modal.classList.remove('active');
};

window.openSettingsModal = async function() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  const user = getCurrentUser();
  if (!user) {
    enforceRouteProtection();
    return;
  }
  
  const keyInput = document.getElementById('openrouter-key-input');
  const modelInput = document.getElementById('custom-ai-model-input');

  if (keyInput) keyInput.value = getOpenRouterKey();
  if (modelInput) modelInput.value = getCustomAIModel();

  modal.classList.add('active');
};

window.closeSettingsModal = function() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('active');
};

window.saveOpenRouterKeyAction = async function() {
  const user = getCurrentUser();
  if (!user) return;
  const keyVal = document.getElementById('openrouter-key-input').value;
  const modelVal = document.getElementById('custom-ai-model-input').value;

  await saveAIConfig(user.uid, keyVal, modelVal);
  showToast('AI Settings & Model saved to Firebase!', 'success');
  closeSettingsModal();
};

window.triggerAIAnalysisAction = async function() {
  const container = document.getElementById('ai-output-container');
  const presetSelect = document.getElementById('ai-model-select');
  const customModelInput = document.getElementById('ai-custom-model-input');

  let selectedModel = presetSelect ? presetSelect.value : 'anthropic/claude-3.5-sonnet';
  if (selectedModel === 'custom' && customModelInput && customModelInput.value.trim()) {
    selectedModel = customModelInput.value.trim();
  }

  if (!container) return;

  container.innerHTML = `
    <div class="card-outer ai-pulse-card">
      <div class="card-inner" style="padding: 32px; min-height: 280px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px;">
        <div class="skeleton" style="width: 60px; height: 60px; border-radius: 50%;"></div>
        <div class="skeleton" style="width: 220px; height: 24px;"></div>
        <div class="skeleton" style="width: 80%; height: 16px;"></div>
        <div class="skeleton" style="width: 70%; height: 16px;"></div>
        <p style="color: var(--accent-primary); font-weight: 600; font-size: 14px; margin-top: 8px;">Synthesizing behavioral patterns with ${selectedModel}...</p>
      </div>
    </div>
  `;

  const markdownResult = await generateAIAnalysis(currentHabits, selectedModel);

  container.innerHTML = `
    <div class="card-outer card-glow-primary animate-pop-in">
      <div class="card-inner" style="padding: 28px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <span class="eyebrow-tag">🧠 AI Productivity Insights</span>
          <span style="font-size: 12px; color: var(--text-subtle);">${selectedModel}</span>
        </div>
        <div style="line-height: 1.7; color: var(--text-main); font-size: 14px; white-space: pre-wrap;">${escapeHtml(markdownResult)}</div>
      </div>
    </div>
  `;
};

function setupModalListeners() {
  const createForm = document.getElementById('create-habit-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      if (!user) return;

      const title = document.getElementById('habit-title').value;
      const description = document.getElementById('habit-desc').value;
      const category = document.getElementById('habit-category').value;
      const startDate = document.getElementById('habit-start-date').value || getTodayDateString();
      const repeatInterval = document.getElementById('habit-interval').value || 1;
      const targetDeadline = document.getElementById('habit-deadline').value;
      const isInfiniteDeadline = document.getElementById('habit-infinite-checkbox').checked;

      await createHabit(user.uid, { 
        title, description, category, startDate, repeatInterval, targetDeadline, isInfiniteDeadline 
      });
      
      currentHabits = await getHabits(user.uid);
      closeCreateHabitModal();
      createForm.reset();
      renderDashboardUI();
      showToast('New habit created!', 'success');
    });
  }
}

function setupAccessibilityModalListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeCreateHabitModal();
      window.closeSettingsModal();
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        window.closeCreateHabitModal();
        window.closeSettingsModal();
      }
    });
  });
}

function triggerConfetti() {
  if (window.confetti) {
    window.confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#6366F1', '#10B981', '#F43F5E', '#F59E0B']
    });
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
