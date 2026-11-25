let statisticsCache = null;
let currentPeriod = 'week';
let currentLogSearchKeyword = '';

function showEmptyState(container, message, className = 'canvas-empty-state') {
  if (!container) return;

  let empty = container.querySelector(`.${className}`);
  if (!empty) {
    empty = document.createElement('div');
    empty.className = `empty-state ${className}`;
    container.appendChild(empty);
  }

  empty.textContent = message;
}

function hideEmptyState(container, className = 'canvas-empty-state') {
  if (!container) return;
  container.querySelectorAll(`.${className}`).forEach(el => el.remove());
}

function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, width, height);
}

function drawBarChart(canvas, labels, a, b) {
  canvas.style.height = '600px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const { width, height } = canvas.getBoundingClientRect();

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, width, height);

  const maxValue = Math.max(...a, ...b, 1);
  const max = maxValue * 1.2;
  const padding = { top: 30, right: 20, bottom: 58, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const chartBottom = padding.top + chartH;
  const groupW = chartW / Math.max(labels.length, 1);

  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH * (i / 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  labels.forEach((label, idx) => {
    const x = padding.left + idx * groupW;
    const barW = groupW * 0.34;
    const h1 = (a[idx] / max) * chartH;
    const h2 = (b[idx] / max) * chartH;

    ctx.fillStyle = '#e84d6a';
    ctx.beginPath();
    ctx.roundRect(x + groupW * 0.08, chartBottom - h1, barW, h1, 3);
    ctx.fill();

    ctx.fillStyle = '#2ec48a';
    ctx.beginPath();
    ctx.roundRect(x + groupW * 0.52, chartBottom - h2, barW, h2, 3);
    ctx.fill();

    ctx.fillStyle = '#7e98bc';
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText(label, x + groupW / 2, chartBottom + 18);
  });

  const legendY = chartBottom + 38;
  const legendCenterX = width / 2;

  ctx.fillStyle = '#e84d6a';
  ctx.beginPath();
  ctx.roundRect(legendCenterX - 60, legendY - 9, 10, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#7e98bc';
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  ctx.fillText('입차', legendCenterX - 46, legendY);

  ctx.fillStyle = '#2ec48a';
  ctx.beginPath();
  ctx.roundRect(legendCenterX + 4, legendY - 9, 10, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#7e98bc';
  ctx.fillText('출차', legendCenterX + 18, legendY);
}

function drawPieChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  let { width, height } = canvas.getBoundingClientRect();

  if (height < 350) {
    height = 380;
    canvas.style.height = '380px';
  }

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, width, height);

  const values = Object.values(items);
  const labels = Object.keys(items);

  const colorMap = {
  '미인식': '#e85d75',
  '불일치': '#e9a15a',
  '기간만료': '#d8b85c',
  '24시간초과': '#9f3a3a',
  '장비이상': '#6fa8dc'
};

  const total = values.reduce((a, b) => a + b, 0);

  let start = -Math.PI / 2;

  const radius = Math.min(width, height) * 0.48;

  values.forEach((value, idx) => {
    const angle = total === 0 ? 0 : (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    ctx.fillStyle = colorMap[labels[idx]] || '#9ca3af';
    ctx.arc(width / 2, height / 2, radius, start, start + angle);
    ctx.closePath();
    ctx.fill();
    start += angle;
  });

  document.getElementById('statisticsLegend').innerHTML = labels.map(label => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${colorMap[label] || '#9ca3af'}"></span>
      ${label} <strong>${items[label]}건</strong>
    </div>
  `).join('');
}

function renderEmptyLogs(message = '표시할 로그가 없습니다.') {
  document.getElementById('statisticsLogBody').innerHTML = `
    <tr>
      <td colspan="3" class="empty-row">${message}</td>
    </tr>
  `;
}

function renderTrend(period, backend) {
  const trendCanvas = document.getElementById('trendChart');
  const trendWrap = trendCanvas.parentElement;
  const series = backend?.charts?.[period];

  if (!series || !Array.isArray(series.labels) || !Array.isArray(series.entries) || !Array.isArray(series.exits) || series.labels.length === 0) {
    clearCanvas(trendCanvas);
    trendCanvas.style.display = 'none';
    showEmptyState(trendWrap, '표시할 입출차 데이터가 없습니다.', 'trend-empty-state');
    return;
  }

  hideEmptyState(trendWrap, 'trend-empty-state');
  trendCanvas.style.display = 'block';
  drawBarChart(trendCanvas, series.labels, series.entries, series.exits);
}

function renderViolation(backend) {
  const pieCanvas = document.getElementById('violationPieChart');
  const pieWrap = pieCanvas.parentElement;
  const legend = document.getElementById('statisticsLegend');

  const items = backend?.charts?.violation_ratio;

  if (!items || Object.keys(items).length === 0 || Object.values(items).every(v => Number(v) === 0)) {
    clearCanvas(pieCanvas);
    pieCanvas.style.display = 'none';
    legend.innerHTML = '';
    showEmptyState(pieWrap, '표시할 위반 통계가 없습니다.', 'violation-empty-state');
    return;
  }

  hideEmptyState(pieWrap, 'violation-empty-state');
  pieCanvas.style.display = 'block';
  drawPieChart(pieCanvas, items);
}

function getFilteredLogs(logs = []) {
  const keyword = currentLogSearchKeyword.trim().toLowerCase();
  if (!keyword) return logs;

  return logs.filter(item => {
    const carNumber = String(item.car_number || '').toLowerCase();
    const eventType = String(item.event_type || '').toLowerCase();
    const eventLabel = item.event_type === 'IN' ? '입차' : item.event_type === 'OUT' ? '출차' : '';
    return carNumber.includes(keyword) || eventType.includes(keyword) || eventLabel.includes(keyword);
  });
}

function renderLogs(backend) {
  const logs = getFilteredLogs(backend?.recent_logs || []);

  if (logs.length) {
    document.getElementById('statisticsLogBody').innerHTML = logs.map(item => `
      <tr>
        <td>${formatDateTime(item.time)}</td>
        <td>${statusBadge(item.event_type)}</td>
        <td>${item.car_number || '-'}</td>
      </tr>
    `).join('');
    return;
  }

  if (backend?.recent_logs?.length) {
    renderEmptyLogs('검색 조건에 맞는 로그가 없습니다.');
    return;
  }

  renderEmptyLogs();
}

function getCustomDateRange() {
  const startDate = document.getElementById('statisticsStartDate')?.value || '';
  const endDate = document.getElementById('statisticsEndDate')?.value || '';
  return { startDate, endDate };
}

function getDateRangeByPeriod(period) {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (period === 'day') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(today.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
  };
}

function syncDateInputsByPeriod(period) {
  if (period === 'custom') return;

  const startInput = document.getElementById('statisticsStartDate');
  const endInput = document.getElementById('statisticsEndDate');
  if (!startInput || !endInput) return;

  const range = getDateRangeByPeriod(period);
  startInput.value = range.startDate;
  endInput.value = range.endDate;
}

async function fetchStatistics(params = {}) {
  const query = new URLSearchParams();

  if (params.period) query.set('period', params.period);
  if (params.startDate) query.set('start_date', params.startDate);
  if (params.endDate) query.set('end_date', params.endDate);

  const url = query.toString() ? `/api/statistics?${query.toString()}` : '/api/statistics';
  return safeFetch(url);
}

function setActivePeriod(period) {
  currentPeriod = period;

  document.querySelectorAll('#statisticsPeriodButtons .chip-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.period === period);
  });

  const customRow = document.getElementById('statisticsCustomDateRange');
  if (customRow) customRow.classList.toggle('hidden', period !== 'custom');

  if (period !== 'custom') {
    syncDateInputsByPeriod(period);
  }
}

async function reloadStatisticsForCurrentPeriod() {
  if (currentPeriod === 'custom') {
    const { startDate, endDate } = getCustomDateRange();

    if (!startDate || !endDate) {
      statisticsCache = {
        charts: {
          custom: { labels: [], entries: [], exits: [] },
          violation_ratio: {}
        },
        recent_logs: []
      };
      renderTrend('custom', statisticsCache);
      renderViolation(statisticsCache);
      renderLogs(statisticsCache);
      return;
    }

    if (startDate > endDate) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }

    statisticsCache = await fetchStatistics({
      period: 'custom',
      startDate,
      endDate
    });

    renderTrend('custom', statisticsCache);
    renderViolation(statisticsCache);
    renderLogs(statisticsCache);
    return;
  }

  const { startDate, endDate } = getDateRangeByPeriod(currentPeriod);
  statisticsCache = await fetchStatistics({ period: currentPeriod, startDate, endDate });
  renderTrend(currentPeriod, statisticsCache);
  renderViolation(statisticsCache);
  renderLogs(statisticsCache);
}

function bindPeriodButtons() {
  document.querySelectorAll('#statisticsPeriodButtons .chip-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      setActivePeriod(btn.dataset.period);
      await reloadStatisticsForCurrentPeriod();
    });
  });
}

function bindLogSearch() {
  const input = document.getElementById('statisticsLogSearch');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      currentLogSearchKeyword = input.value || '';
      renderLogs(statisticsCache || { recent_logs: [] });
    }
  });
}

function bindDateInputs() {
  const startInput = document.getElementById('statisticsStartDate');
  const endInput = document.getElementById('statisticsEndDate');

  const handler = async () => {
    setActivePeriod('custom');

    const { startDate, endDate } = getCustomDateRange();

    if (!startDate || !endDate) {
      return;
    }

    if (startDate > endDate) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }

    await reloadStatisticsForCurrentPeriod();
  };

  if (startInput) startInput.addEventListener('change', handler);
  if (endInput) endInput.addEventListener('change', handler);
}

async function loadStatistics() {
  initializeLayout('통계 및 로그', 'statistics');

  setActivePeriod('month');

  const { startDate, endDate } = getDateRangeByPeriod('month');
  statisticsCache = await fetchStatistics({ period: 'month', startDate, endDate });
  renderTrend('month', statisticsCache);
  renderViolation(statisticsCache);
  renderLogs(statisticsCache);

  bindPeriodButtons();
  bindDateInputs();
  bindLogSearch();
}
document.addEventListener('DOMContentLoaded', loadStatistics);
