/* ==========================================
   HABIT PRO - HABIT DETAIL & REFLECTION ENGINE
   ========================================== */

import { initAuth, getCurrentUser, subscribeAuthState, enforceRouteProtection } from './auth.js';
import { getHabits, logHabitCheckIn, isHabitDueOnDate, calculateHabitStreak, getTodayDateString } from './habits.js';

let currentUserId = null;
let currentHabitId = null;
let currentHabit = null;
let selectedDateStr = getTodayDateString();
let currentMonthOffset = 0;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  currentHabitId = urlParams.get('id') || 'habit_1';

  subscribeAuthState(async (user) => {
    if (!user) {
      enforceRouteProtection();
      return;
    }
    currentUserId = user.uid;
    await loadHabitDetail();
  });
});

async function loadHabitDetail() {
  const user = getCurrentUser();
  if (!user) {
    enforceRouteProtection();
    return;
  }

  const habits = await getHabits(currentUserId);
  currentHabit = habits.find(h => h.id === currentHabitId) || habits[0];

  if (!currentHabit) {
    document.getElementById('habit-detail-wrapper').innerHTML = `
      <div class="card-outer">
        <div class="card-inner" style="text-align: center; padding: 48px;">
          <h2>Habit Not Found</h2>
          <p style="color: var(--text-muted); margin-top: 8px;">The requested habit detail could not be loaded.</p>
          <a href="index.html" class="btn btn-primary" style="margin-top: 16px;">Back to Dashboard</a>
        </div>
      </div>
    `;
    return;
  }

  renderHabitHeader();
  renderMonthCalendarHistory();
  renderDateNoteCard(selectedDateStr);
}

function renderHabitHeader() {
  const titleEl = document.getElementById('detail-title');
  const descEl = document.getElementById('detail-desc');
  const categoryEl = document.getElementById('detail-category');
  const streakEl = document.getElementById('detail-streak');
  const deadlineEl = document.getElementById('detail-deadline');
  const intervalEl = document.getElementById('detail-interval-badge');
  const progressFill = document.getElementById('detail-progress-fill');

  if (titleEl) titleEl.textContent = currentHabit.title;
  if (descEl) descEl.textContent = currentHabit.description || 'No description provided.';
  
  if (categoryEl) {
    categoryEl.className = `category-badge cat-${(currentHabit.category || 'productivity').toLowerCase()}`;
    categoryEl.textContent = currentHabit.category || 'Productivity';
  }

  const interval = parseInt(currentHabit.repeatInterval || 1, 10);
  if (intervalEl) {
    intervalEl.textContent = interval === 1 ? '🔄 Everyday' : `🔄 Every ${interval} Days`;
  }

  const streak = calculateHabitStreak(currentHabit.logs);
  if (streakEl) streakEl.textContent = `${streak}🔥 Days Streak`;

  if (currentHabit.isInfiniteDeadline) {
    if (deadlineEl) deadlineEl.textContent = '♾️ Infinite / No Deadline';
    if (progressFill) progressFill.style.width = '100%';
  } else if (currentHabit.targetDeadline) {
    const diffTime = new Date(currentHabit.targetDeadline) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (deadlineEl) deadlineEl.textContent = diffDays > 0 ? `${diffDays} Days Remaining` : 'Deadline reached';
    if (progressFill) progressFill.style.width = diffDays > 0 ? `${Math.min(100, Math.max(10, 100 - (diffDays * 2)))}%` : '100%';
  } else {
    if (deadlineEl) deadlineEl.textContent = 'Ongoing Habit';
    if (progressFill) progressFill.style.width = '100%';
  }
}

function renderMonthCalendarHistory() {
  const gridContainer = document.getElementById('calendar-days-grid');
  const monthLabelEl = document.getElementById('current-month-label');
  if (!gridContainer) return;

  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + currentMonthOffset);

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  if (monthLabelEl) {
    monthLabelEl.textContent = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const daysInMonth = lastDayOfMonth.getDate();
  const dayBoxes = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().split('T')[0];

    const isDue = isHabitDueOnDate(currentHabit, dateStr);
    const log = (currentHabit.logs && currentHabit.logs[dateStr]) || null;
    const isCompleted = log && log.completed;
    const hasNote = log && log.note && log.note.trim().length > 0;
    const isSelected = dateStr === selectedDateStr;

    if (isDue) {
      dayBoxes.push(`
        <div 
          class="calendar-day-box ${isCompleted ? 'day-completed' : 'day-missed'} ${isSelected ? 'day-selected' : ''}"
          onclick="window.selectDetailDate('${dateStr}')"
          title="Scheduled Day: ${dateStr}"
        >
          <span class="day-num">${day}</span>
          <span class="month-label">${d.toLocaleDateString('en-US', { month: 'short' })}</span>
          ${hasNote ? '<span class="note-indicator-dot">📝</span>' : ''}
        </div>
      `);
    } else {
      dayBoxes.push(`
        <div 
          class="calendar-day-box day-skipped ${isSelected ? 'day-selected' : ''}"
          onclick="window.selectDetailDate('${dateStr}')"
          title="Skipped Interval Day: ${dateStr}"
          style="opacity: 0.35; background: rgba(255,255,255,0.01);"
        >
          <span class="day-num" style="color: var(--text-subtle);">${day}</span>
          <span class="month-label" style="font-size: 9px;">Off Day</span>
          ${hasNote ? '<span class="note-indicator-dot">📝</span>' : ''}
        </div>
      `);
    }
  }

  gridContainer.innerHTML = dayBoxes.join('');
}

function renderDateNoteCard(dateStr) {
  selectedDateStr = dateStr;
  renderMonthCalendarHistory();

  const container = document.getElementById('date-note-container');
  if (!container) return;

  const log = (currentHabit.logs && currentHabit.logs[dateStr]) || null;
  const isCompleted = log ? log.completed : false;
  const noteText = log ? (log.note || '') : '';
  const isDue = isHabitDueOnDate(currentHabit, dateStr);

  const d = new Date(dateStr + 'T00:00:00');
  const formattedDate = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  container.innerHTML = `
    <div class="card-outer card-glow-primary animate-pop-in">
      <div class="card-inner" style="padding: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="eyebrow-tag">${isDue ? '📅 SCHEDULED HABIT DAY' : '⏸️ OFF / SKIPPED INTERVAL DAY'}</span>
            <h3 style="margin-top: 4px;">${formattedDate}</h3>
          </div>

          <button 
            class="btn ${isCompleted ? 'btn-success' : 'btn-glass'}" 
            onclick="window.toggleDetailCheckIn('${dateStr}', ${!isCompleted})"
          >
            <span>${isCompleted ? '✓ Completed on this day' : 'Mark Completed for this day'}</span>
          </button>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Daily Reflection & Notes for ${dateStr}:</label>
          <textarea id="detail-note-textarea" class="form-textarea" placeholder="Write your reflection for this day...">${escapeHtml(noteText)}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn btn-primary" onclick="window.saveDetailNote('${dateStr}')">
            <span>💾 Save Reflection Note</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

window.navigateMonth = function(direction) {
  currentMonthOffset += direction;
  renderMonthCalendarHistory();
};

window.selectDetailDate = function(dateStr) {
  renderDateNoteCard(dateStr);
};

window.toggleDetailCheckIn = async function(dateStr, completed) {
  const noteInput = document.getElementById('detail-note-textarea');
  const noteText = noteInput ? noteInput.value : '';

  await logHabitCheckIn(currentUserId, currentHabitId, dateStr, completed, noteText);
  await loadHabitDetail();
  if (completed && window.confetti) {
    window.confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
  }
};

window.saveDetailNote = async function(dateStr) {
  const noteInput = document.getElementById('detail-note-textarea');
  const noteText = noteInput ? noteInput.value : '';
  const log = (currentHabit.logs && currentHabit.logs[dateStr]) || null;
  const isCompleted = log ? log.completed : true;

  await logHabitCheckIn(currentUserId, currentHabitId, dateStr, isCompleted, noteText);
  await loadHabitDetail();
  
  const toastContainer = document.getElementById('toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = 'toast toast-success show';
  toast.innerHTML = '<span>Reflection note saved!</span>';
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
