let deviceErrorItems = [];
let selectedPeriod = 'all';
let selectedStatus = '전체';
let deviceErrorDirty = false;

function isAdmin() {
  const user = getStoredUser();
  return user?.role === 'ADMIN';
}

function getCurrentUserRole() {
  const user = getStoredUser();
  return user?.role || '';
}

function calculateDeviceErrorSummary(items) {
  return {
    total: items.length,
    미처리: items.filter(i => (i.status || '미처리') === '미처리').length,
    처리중: items.filter(i => i.status === '처리중').length,
    완료: items.filter(i => i.status === '완료').length,
  };
}

function updateDeviceErrorSummaryAndTable() {
  const filtered = filterDeviceErrorItems(deviceErrorItems);
  const summary = calculateDeviceErrorSummary(filtered);

  renderDeviceErrorSummary(summary);
  renderDeviceErrorTable();
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
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };
}

function syncDateInputsByPeriod(period) {
  const startInput = document.getElementById('deviceErrorStartDate');
  const endInput = document.getElementById('deviceErrorEndDate');
  if (!startInput || !endInput) return;

  if (period === 'custom') return;
  if (period === 'all') {
    startInput.value = '';
    endInput.value = '';
    return;
  }

  const range = getDateRangeByPeriod(period);
  startInput.value = range.start;
  endInput.value = range.end;
}

function bindPeriodButtons() {
  const buttons = document.querySelectorAll('#periodButtons .chip-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      buttons.forEach(el => el.classList.remove('active'));
      btn.classList.add('active');

      selectedPeriod = btn.dataset.period;

      syncDateInputsByPeriod(selectedPeriod);
      toggleCustomDateRow(selectedPeriod);

      await loadDeviceErrorPageData(true, true);
    });
  });
}

function bindDateInputs() {
  const startInput = document.getElementById('deviceErrorStartDate');
  const endInput = document.getElementById('deviceErrorEndDate');

  const handler = async () => {
    selectedPeriod = 'custom';
    activateCustomPeriodButton();

    const { startDate, endDate } = getCustomDateRange();

    if (!startDate || !endDate) {
      return;
    }

    await loadDeviceErrorPageData(true, true);
  };

  if (startInput) startInput.addEventListener('change', handler);
  if (endInput) endInput.addEventListener('change', handler);
}

function getCustomDateRange() {
  const startDate = document.getElementById('deviceErrorStartDate')?.value || '';
  const endDate = document.getElementById('deviceErrorEndDate')?.value || '';

  return { startDate, endDate };
}

function activateCustomPeriodButton() {
  const buttons = document.querySelectorAll('#periodButtons .chip-btn');

  buttons.forEach(el => {
    el.classList.toggle('active', el.dataset.period === 'custom');
  });

  const customRow = document.getElementById('customDateRange');
  if (customRow) customRow.classList.remove('hidden');
}

function toggleCustomDateRow(period) {
  const customRow = document.getElementById('customDateRange');
  if (customRow) customRow.classList.toggle('hidden', period !== 'custom');
}

function filterDeviceErrorItems(items) {
  let filtered = [...items];

  if (selectedStatus !== '전체') {
    filtered = filtered.filter(item => (item.status || '미처리') === selectedStatus);
  }

  return filtered;
}

function renderDeviceErrorSummary(summary) {
  const total = summary?.total || 0;
  const pending = summary?.미처리 || 0;
  const processing = summary?.처리중 || 0;
  const done = summary?.완료 || 0;

  const el = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  el('deviceErrorStatTotal', total);
  el('deviceErrorStatPending', pending);
  el('deviceErrorStatProcessing', processing);
  el('deviceErrorStatDone', done);
}

function bindStatCards() {
  document.querySelectorAll('[data-status]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-status]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      selectedStatus = card.dataset.status;

      updateDeviceErrorSummaryAndTable();
    });
  });
}

function deviceTypeBadge(type) {
  if (type === '무게센서') return `<span class="status-chip blue">무게센서</span>`;
  if (type === 'RFID리더기') return `<span class="status-chip yellow">RFID리더기</span>`;
  if (type === '보드') return `<span class="status-chip gray">보드</span>`;
  return `<span class="status-chip gray">${type || '-'}</span>`;
}

function renderDeviceErrorTable() {
  const body = document.getElementById('deviceErrorTableBody');
  if (!body) return;

  const rows = filterDeviceErrorItems(deviceErrorItems);
  const periodText = {
    all: '전체 기간',
    day: '오늘',
    week: '최근 7일',
    month: '최근 30일',
    custom: '사용자 지정 기간',
  }[selectedPeriod] || '선택한 기간';

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;">${periodText}에 표시할 장비이상 로그가 없습니다.</td>
      </tr>
    `;
    return;
  }

     body.innerHTML = rows.map(item => `
    <tr>
      <td>${formatDateTime(item.detected_at)}</td>
      <td>${deviceTypeBadge(item.device_type)}</td>
      <td>${item.device_uid || '-'}</td>
      <td>${item.error_code || '-'}</td>
      <td>${item.error_detail || '-'}</td>
      <td>
        <select class="status-select" data-status-select="${item.error_id}" ${isAdmin() ? 'disabled' : ''}>
          <option value="미처리" ${(item.status || '미처리') === '미처리' ? 'selected' : ''}>미처리</option>
          <option value="처리중" ${(item.status || '미처리') === '처리중' ? 'selected' : ''}>처리중</option>
          <option value="완료" ${(item.status || '미처리') === '완료' ? 'selected' : ''}>완료</option>
        </select>
      </td>
      <td>
        <textarea class="abnormal-note-input" data-note-input="${item.error_id}" rows="2"
          ${isAdmin() ? 'disabled' : ''}>${item.action || ''}</textarea>
      </td>
      <td>
        ${isAdmin() ? '-' : `<button class="save-btn" onclick="saveDeviceError(${item.error_id})">저장</button>`}
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-status-select], [data-note-input]').forEach(el => {
    el.addEventListener('change', () => {
      deviceErrorDirty = true;
    });

    el.addEventListener('input', () => {
      deviceErrorDirty = true;
    });
  });
}


async function saveDeviceError(errorId) {
  const statusEl = document.querySelector(`[data-status-select="${errorId}"]`);
  const noteEl = document.querySelector(`[data-note-input="${errorId}"]`);

  if (!statusEl || !noteEl) {
    alert('저장할 데이터를 찾을 수 없습니다.');
    return;
  }

  const status = statusEl.value;
  const action = noteEl.value;

  try {
    const response = await fetch(`/api/device-error-logs/${errorId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: status,
        action: action,
        role: getCurrentUserRole(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.detail || '저장에 실패했습니다.');
      return;
    }

    deviceErrorDirty = false;
    alert('저장되었습니다.');
    await loadDeviceErrorPageData(true, true);

  } catch (error) {
    console.error(error);
    alert('서버 오류가 발생했습니다.');
  }
}

async function loadDeviceErrorPageData(force = false, showAlert = false) {
  if (deviceErrorDirty && !force) {
    return;
  }

  const query = new URLSearchParams();

  if (selectedPeriod) {
    query.set('period', selectedPeriod);
  }

  if (selectedPeriod !== 'all') {
    const startDate = document.getElementById('deviceErrorStartDate')?.value || '';
    const endDate = document.getElementById('deviceErrorEndDate')?.value || '';

    if (startDate && endDate && startDate > endDate) {
      if (showAlert) {
        alert('검색 시작일은 종료일보다 늦을 수 없습니다.');
      }
      return;
    }

    if (startDate) query.set('start_date', startDate);
    if (endDate) query.set('end_date', endDate);
  }

  const queryString = query.toString();

  try {
    const listResponse = await fetch(`/api/device-error-logs?${queryString}`);

    if (!listResponse.ok) {
      const errorData = await listResponse.json();

      if (showAlert) {
        alert(errorData.detail || '장비이상 로그 목록 조회에 실패했습니다.');
      }

      return;
    }

    const list = await listResponse.json();
    deviceErrorItems = Array.isArray(list) ? list : [];

    let summary = null;

    try {
      const summaryResponse = await fetch(`/api/device-error-logs/summary?${queryString}`);

      if (summaryResponse.ok) {
        summary = await summaryResponse.json();
      }
    } catch (error) {
      console.error('장비이상 요약 조회 실패:', error);
    }

    if (!summary) {
      summary = calculateDeviceErrorSummary(deviceErrorItems);
    }

    renderDeviceErrorSummary(summary);
    renderDeviceErrorTable();

    if (typeof loadAlarmCount === 'function') {
      loadAlarmCount();
    }
  } catch (error) {
    console.error(error);

    if (showAlert) {
      alert('장비이상 로그 조회 중 서버 오류가 발생했습니다.');
    }
  }
}

async function initializeDeviceErrorPage() {
  if (!initializeLayout('장비이상 로그', 'device_error')) return;

  const roleInfo = document.getElementById('deviceErrorRoleInfo');
  if (roleInfo) {
    roleInfo.textContent = isAdmin() ? '관리자는 조회만 가능합니다.' : '사용자는 상태와 조치 내용을 수정할 수 있습니다.';
  }

  syncDateInputsByPeriod(selectedPeriod);
  bindPeriodButtons();
  bindStatCards();
  bindDateInputs();

  await loadDeviceErrorPageData(true, true);

  setInterval(() => loadDeviceErrorPageData(false, false), 5000);
}

document.addEventListener('DOMContentLoaded', initializeDeviceErrorPage);
