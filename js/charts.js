/* ==========================================
   HABIT PRO - CHART.JS & VISUAL ENGINE
   Renders Completion Trends, Category Doughnut,
   and Interactive Streak Heatmap Matrix.
   ========================================== */

let completionChartInstance = null;
let categoryChartInstance = null;

// Color maps matching CSS tokens
const CATEGORY_COLORS = {
  'Health': { bg: 'rgba(16, 185, 129, 0.8)', border: '#10B981' },
  'Mind': { bg: 'rgba(139, 92, 246, 0.8)', border: '#8B5CF6' },
  'Productivity': { bg: 'rgba(99, 102, 241, 0.8)', border: '#6366F1' },
  'Fitness': { bg: 'rgba(244, 63, 94, 0.8)', border: '#F43F5E' },
  'Custom': { bg: 'rgba(245, 158, 11, 0.8)', border: '#F59E0B' }
};

// 1. Render Daily Completion Rate Chart (Bar/Line)
export function renderCompletionTrendChart(canvasId, habits, timeframeDays = 7) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Prepare dates & labels
  const labels = [];
  const completionPercentages = [];
  const today = new Date();

  for (let i = timeframeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Label format: "Jul 28"
    const labelStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(labelStr);

    let completedCount = 0;
    habits.forEach(h => {
      if (h.logs && h.logs[dateStr] && h.logs[dateStr].completed) {
        completedCount++;
      }
    });

    const rate = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
    completionPercentages.push(rate);
  }

  // Destroy previous instance
  if (completionChartInstance) {
    completionChartInstance.destroy();
  }

  // Custom Chart Gradient
  const chartCtx = ctx.getContext('2d');
  const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  completionChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Completion Rate (%)',
        data: completionPercentages,
        borderColor: '#6366F1',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#090D16',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#131B30',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context) => ` Completion: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', size: 12 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94A3B8',
            font: { family: 'Plus Jakarta Sans', size: 12 },
            callback: (value) => value + '%'
          }
        }
      }
    }
  });
}

// 2. Render Category Breakdown Doughnut Chart
export function renderCategoryDoughnutChart(canvasId, habits) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const categoryCounts = {};
  habits.forEach(h => {
    const cat = h.category || 'Productivity';
    let completedLogs = 0;
    if (h.logs) {
      Object.values(h.logs).forEach(l => {
        if (l.completed) completedLogs++;
      });
    }
    categoryCounts[cat] = (categoryCounts[cat] || 0) + (completedLogs || 1);
  });

  const labels = Object.keys(categoryCounts);
  const data = Object.values(categoryCounts);
  const bgColors = labels.map(cat => (CATEGORY_COLORS[cat] || CATEGORY_COLORS['Custom']).bg);
  const borderColors = labels.map(cat => (CATEGORY_COLORS[cat] || CATEGORY_COLORS['Custom']).border);

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#F8FAFC',
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: '#131B30',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12
        }
      }
    }
  });
}

// 3. Render Streak Heatmap Matrix (GitHub / Duolingo Style Calendar Grid)
export function renderStreakHeatmap(containerId, habits) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const today = new Date();
  const daysToShow = 28; // Last 4 weeks
  const gridCells = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    let totalCompleted = 0;
    habits.forEach(h => {
      if (h.logs && h.logs[dateStr] && h.logs[dateStr].completed) {
        totalCompleted++;
      }
    });

    const completionRatio = habits.length > 0 ? totalCompleted / habits.length : 0;
    
    // Intensity color scaling
    let intensityClass = 'level-0';
    if (completionRatio > 0 && completionRatio <= 0.33) intensityClass = 'level-1';
    else if (completionRatio > 0.33 && completionRatio <= 0.66) intensityClass = 'level-2';
    else if (completionRatio > 0.66) intensityClass = 'level-3';

    gridCells.push(`
      <div class="heatmap-cell ${intensityClass}" title="${dateStr}: ${totalCompleted}/${habits.length} habits completed">
        <span class="heatmap-date">${d.getDate()}</span>
      </div>
    `);
  }

  container.innerHTML = `
    <div class="heatmap-grid">
      ${gridCells.join('')}
    </div>
    <div class="heatmap-legend">
      <span>Less</span>
      <div class="heatmap-cell level-0"></div>
      <div class="heatmap-cell level-1"></div>
      <div class="heatmap-cell level-2"></div>
      <div class="heatmap-cell level-3"></div>
      <span>More</span>
    </div>
  `;
}
